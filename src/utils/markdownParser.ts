import type { ListItem, ParsedMarkdown } from '../types/markdown'
import {
  extractId,
  removeIdComment,
  generateId,
  embedId,
  matchNodes,
} from './idManager'

const LIST_ITEM_REGEX = /^(\s*)([-*+]|\d+\.)\s+(.+)$/

interface RawListItem {
  text: string
  cleanText: string
  id: string | null
  indent: number
  listType: 'unordered' | 'ordered'
  lineNumber: number
}

function calculateIndentLevel(indent: string): number {
  const spaces = indent.replace(/\t/g, '    ').length
  return Math.floor(spaces / 2)
}

function tokenize(markdown: string): RawListItem[] {
  const lines = markdown.split('\n')
  const items: RawListItem[] = []

  lines.forEach((line, index) => {
    const match = line.match(LIST_ITEM_REGEX)
    if (match) {
      const [, indent, marker, text] = match
      const id = extractId(text)
      const cleanText = removeIdComment(text)

      items.push({
        text: text.trim(),
        cleanText,
        id,
        indent: calculateIndentLevel(indent),
        listType: /^\d+\.$/.test(marker) ? 'ordered' : 'unordered',
        lineNumber: index + 1,
      })
    }
  })

  return items
}

function buildTree(items: RawListItem[]): ListItem[] {
  const root: ListItem[] = []
  const stack: { item: ListItem; level: number }[] = []

  items.forEach((raw) => {
    const item: ListItem = {
      id: raw.id ?? generateId(),
      text: raw.cleanText,
      level: raw.indent,
      lineNumber: raw.lineNumber,
      listType: raw.listType,
      children: [],
    }

    while (stack.length > 0 && stack[stack.length - 1].level >= raw.indent) {
      stack.pop()
    }

    if (stack.length === 0) {
      root.push(item)
    } else {
      stack[stack.length - 1].item.children.push(item)
    }

    stack.push({ item, level: raw.indent })
  })

  return root
}

/**
 * マークダウンをパースしてListItemツリーを生成
 */
export function parseMarkdown(markdown: string): ParsedMarkdown {
  const tokens = tokenize(markdown)
  const items = buildTree(tokens)

  return {
    items,
    rawText: markdown,
  }
}

/**
 * マークダウンをパースし、IDがないノードにIDを付与したマークダウンも返す
 * 双方向同期用に、IDを持つマークダウンを返す
 */
export function parseAndEnsureIds(markdown: string): {
  parsed: ParsedMarkdown
  markdownWithIds: string
  hasChanges: boolean
} {
  const lines = markdown.split('\n')
  const newLines: string[] = []
  let hasChanges = false

  lines.forEach((line) => {
    const match = line.match(LIST_ITEM_REGEX)
    if (match) {
      const [, indent, marker, text] = match
      const existingId = extractId(text)

      if (existingId) {
        newLines.push(line)
      } else {
        const newId = generateId()
        const newText = embedId(text.trim(), newId)
        newLines.push(`${indent}${marker} ${newText}`)
        hasChanges = true
      }
    } else {
      newLines.push(line)
    }
  })

  const markdownWithIds = newLines.join('\n')
  const parsed = parseMarkdown(markdownWithIds)

  return {
    parsed,
    markdownWithIds,
    hasChanges,
  }
}

/**
 * ListItemツリーからIDのマッピングを取得
 */
export function getIdMapping(items: ListItem[]): Map<string, ListItem> {
  const map = new Map<string, ListItem>()

  function traverse(item: ListItem): void {
    map.set(item.id, item)
    item.children.forEach(traverse)
  }

  items.forEach(traverse)
  return map
}

/**
 * 特定のIDを持つノードを検索
 */
export function findNodeById(items: ListItem[], id: string): ListItem | null {
  for (const item of items) {
    if (item.id === id) return item
    const found = findNodeById(item.children, id)
    if (found) return found
  }
  return null
}

/**
 * 特定のIDを持つノードの親を検索
 */
export function findParentNode(
  items: ListItem[],
  id: string,
  parent: ListItem | null = null,
): ListItem | null {
  for (const item of items) {
    if (item.id === id) return parent
    const found = findParentNode(item.children, id, item)
    if (found !== null) return found
  }
  return null
}

/**
 * IDなしでツリーをビルド（マッチング用）
 */
interface TempListItem {
  text: string
  level: number
  lineNumber: number
  listType: 'unordered' | 'ordered'
  children: TempListItem[]
}

function buildTreeWithoutIds(items: RawListItem[]): TempListItem[] {
  const root: TempListItem[] = []
  const stack: { item: TempListItem; level: number }[] = []

  items.forEach((raw) => {
    const item: TempListItem = {
      text: raw.cleanText,
      level: raw.indent,
      lineNumber: raw.lineNumber,
      listType: raw.listType,
      children: [],
    }

    while (stack.length > 0 && stack[stack.length - 1].level >= raw.indent) {
      stack.pop()
    }

    if (stack.length === 0) {
      root.push(item)
    } else {
      stack[stack.length - 1].item.children.push(item)
    }

    stack.push({ item, level: raw.indent })
  })

  return root
}

/**
 * TempListItemにIDを割り当ててListItemに変換
 */
function assignIds(
  items: TempListItem[],
  idMapping: Map<number, string>,
  counter: { value: number },
): ListItem[] {
  return items.map((item) => {
    const currentIndex = counter.value
    counter.value++

    const id = idMapping.get(currentIndex) ?? generateId()

    return {
      id,
      text: item.text,
      level: item.level,
      lineNumber: item.lineNumber,
      listType: item.listType,
      children: assignIds(item.children, idMapping, counter),
    }
  })
}

/**
 * IDなしマークダウンと既存ツリーを同期
 * - 既存ノードとマッチすればIDを保持
 * - 新規行には新しいIDを付与
 *
 * @param newMarkdown - 新しいマークダウン（IDコメントなし）
 * @param existingItems - 既存のListItemツリー（IDあり）
 * @returns パース結果とIDを埋め込んだマークダウン
 */
export function syncMarkdownWithTree(
  newMarkdown: string,
  existingItems: ListItem[] | null,
): { parsed: ParsedMarkdown; markdownWithIds: string } {
  // 新しいマークダウンをトークン化
  const tokens = tokenize(newMarkdown)

  // 既存ツリーがなければ通常のパース
  if (!existingItems || existingItems.length === 0) {
    return parseAndEnsureIds(newMarkdown)
  }

  // IDなしでツリーをビルド
  const tempTree = buildTreeWithoutIds(tokens)

  // 既存ツリーとマッチング
  const idMapping = matchNodes(existingItems, tempTree)

  // IDを割り当て
  const items = assignIds(tempTree, idMapping, { value: 0 })

  // IDを埋め込んだマークダウンを生成
  const lines = newMarkdown.split('\n')
  const newLines: string[] = []
  let itemIndex = 0

  const flattenItems = (list: ListItem[]): ListItem[] => {
    const result: ListItem[] = []
    for (const item of list) {
      result.push(item)
      result.push(...flattenItems(item.children))
    }
    return result
  }

  const flatItems = flattenItems(items)

  lines.forEach((line) => {
    const match = line.match(LIST_ITEM_REGEX)
    if (match && itemIndex < flatItems.length) {
      const [, indent, marker, text] = match
      const cleanText = removeIdComment(text)
      const item = flatItems[itemIndex]
      const newText = embedId(cleanText.trim(), item.id)
      newLines.push(`${indent}${marker} ${newText}`)
      itemIndex++
    } else {
      newLines.push(line)
    }
  })

  const markdownWithIds = newLines.join('\n')
  const parsed: ParsedMarkdown = { items, rawText: markdownWithIds }

  return { parsed, markdownWithIds }
}
