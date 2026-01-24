/**
 * ツリー操作ユーティリティ
 * ListItemツリーの追加・削除・移動・更新操作を提供
 */

import type { ListItem } from '../types/markdown'
import { generateId } from './idManager'

/**
 * ツリーをディープコピー
 */
export function cloneTree(items: ListItem[]): ListItem[] {
  return items.map((item) => ({
    ...item,
    children: cloneTree(item.children),
  }))
}

/**
 * 特定のIDを持つノードを検索
 */
export function findNode(items: ListItem[], id: string): ListItem | null {
  for (const item of items) {
    if (item.id === id) return item
    const found = findNode(item.children, id)
    if (found) return found
  }
  return null
}

/**
 * 特定のIDを持つノードの親を検索
 */
export function findParent(
  items: ListItem[],
  id: string,
  parent: ListItem | null = null,
): ListItem | null {
  for (const item of items) {
    if (item.id === id) return parent
    const found = findParent(item.children, id, item)
    if (found !== null) return found
  }
  return null
}

/**
 * 特定のIDを持つノードの兄弟リストとインデックスを取得
 */
export function findSiblings(
  items: ListItem[],
  id: string,
): { siblings: ListItem[]; index: number } | null {
  for (let i = 0; i < items.length; i++) {
    if (items[i].id === id) {
      return { siblings: items, index: i }
    }
    const found = findSiblings(items[i].children, id)
    if (found) return found
  }
  return null
}

/**
 * 新しいListItemを作成
 */
export function createNode(
  text: string,
  level: number,
  listType: 'unordered' | 'ordered' = 'unordered',
): ListItem {
  return {
    id: generateId(),
    text,
    level,
    lineNumber: 0,
    listType,
    children: [],
  }
}

/**
 * 親ノードに子ノードを追加
 * @returns 新しいツリーと追加されたノードのID
 */
export function addChildNode(
  items: ListItem[],
  parentId: string,
  text = '新しいノード',
): { items: ListItem[]; newNodeId: string } {
  const newItems = cloneTree(items)
  const parent = findNode(newItems, parentId)

  if (!parent) {
    throw new Error(`Parent node not found: ${parentId}`)
  }

  const newNode = createNode(text, parent.level + 1, parent.listType)
  parent.children.push(newNode)

  return { items: newItems, newNodeId: newNode.id }
}

/**
 * 兄弟ノードを追加（指定ノードの直後に挿入）
 * @returns 新しいツリーと追加されたノードのID
 */
export function addSiblingNode(
  items: ListItem[],
  siblingId: string,
  text = '新しいノード',
): { items: ListItem[]; newNodeId: string } {
  const newItems = cloneTree(items)
  const result = findSiblings(newItems, siblingId)

  if (!result) {
    throw new Error(`Sibling node not found: ${siblingId}`)
  }

  const { siblings, index } = result
  const sibling = siblings[index]
  const newNode = createNode(text, sibling.level, sibling.listType)

  siblings.splice(index + 1, 0, newNode)

  return { items: newItems, newNodeId: newNode.id }
}

/**
 * 兄弟ノードを追加（指定ノードの直前に挿入）
 * @returns 新しいツリーと追加されたノードのID
 */
export function addSiblingNodeBefore(
  items: ListItem[],
  siblingId: string,
  text = '新しいノード',
): { items: ListItem[]; newNodeId: string } {
  const newItems = cloneTree(items)
  const result = findSiblings(newItems, siblingId)

  if (!result) {
    throw new Error(`Sibling node not found: ${siblingId}`)
  }

  const { siblings, index } = result
  const sibling = siblings[index]
  const newNode = createNode(text, sibling.level, sibling.listType)

  siblings.splice(index, 0, newNode)

  return { items: newItems, newNodeId: newNode.id }
}

/**
 * ノードを削除
 * @returns 新しいツリー
 */
export function deleteNode(items: ListItem[], nodeId: string): ListItem[] {
  const newItems = cloneTree(items)
  const result = findSiblings(newItems, nodeId)

  if (!result) {
    throw new Error(`Node not found: ${nodeId}`)
  }

  const { siblings, index } = result
  siblings.splice(index, 1)

  return newItems
}

/**
 * ノードのテキストを更新
 * @returns 新しいツリー
 */
export function updateNodeText(
  items: ListItem[],
  nodeId: string,
  newText: string,
): ListItem[] {
  const newItems = cloneTree(items)
  const node = findNode(newItems, nodeId)

  if (!node) {
    throw new Error(`Node not found: ${nodeId}`)
  }

  node.text = newText
  return newItems
}

/**
 * ノードを移動（別の親の子として）
 * @returns 新しいツリー
 */
export function moveNode(
  items: ListItem[],
  nodeId: string,
  newParentId: string | null,
): ListItem[] {
  const newItems = cloneTree(items)

  // ノードを現在の位置から削除
  const sourceResult = findSiblings(newItems, nodeId)
  if (!sourceResult) {
    throw new Error(`Node not found: ${nodeId}`)
  }

  const { siblings: sourceSiblings, index: sourceIndex } = sourceResult
  const [movedNode] = sourceSiblings.splice(sourceIndex, 1)

  // 新しい親に追加
  if (newParentId === null) {
    // ルートレベルに移動
    movedNode.level = 0
    newItems.push(movedNode)
  } else {
    const newParent = findNode(newItems, newParentId)
    if (!newParent) {
      throw new Error(`New parent not found: ${newParentId}`)
    }
    movedNode.level = newParent.level + 1
    newParent.children.push(movedNode)
  }

  // 移動したノードの子孫のレベルを更新
  function updateChildLevels(node: ListItem, parentLevel: number): void {
    node.level = parentLevel + 1
    node.children.forEach((child) => updateChildLevels(child, node.level))
  }

  movedNode.children.forEach((child) =>
    updateChildLevels(child, movedNode.level),
  )

  return newItems
}

/**
 * 行番号を再計算（マークダウン出力時に使用）
 */
export function recalculateLineNumbers(items: ListItem[]): ListItem[] {
  const newItems = cloneTree(items)
  let lineNumber = 1

  function traverse(item: ListItem): void {
    item.lineNumber = lineNumber++
    item.children.forEach(traverse)
  }

  newItems.forEach(traverse)
  return newItems
}

/**
 * 全ノードのIDをリストで取得
 */
export function getAllNodeIds(items: ListItem[]): string[] {
  const ids: string[] = []

  function traverse(item: ListItem): void {
    ids.push(item.id)
    item.children.forEach(traverse)
  }

  items.forEach(traverse)
  return ids
}

/**
 * 祖先が選択に含まれるノードを除外し、冗長な選択を排除する
 */
export function filterRedundantNodes(
  items: ListItem[],
  nodeIds: string[],
): string[] {
  const idSet = new Set(nodeIds)

  function isAncestorSelected(
    targetId: string,
    tree: ListItem[],
    ancestors: string[],
  ): boolean {
    for (const item of tree) {
      if (item.id === targetId) {
        return ancestors.some((a) => idSet.has(a))
      }
      if (
        isAncestorSelected(targetId, item.children, [...ancestors, item.id])
      ) {
        return true
      }
    }
    return false
  }

  return nodeIds.filter((id) => !isAncestorSelected(id, items, []))
}

/**
 * 複数ノードを一括削除
 * filterRedundantNodesで冗長削除を防止してから削除する
 */
export function deleteNodes(items: ListItem[], nodeIds: string[]): ListItem[] {
  const targetIds = new Set(filterRedundantNodes(items, nodeIds))

  function removeFromTree(tree: ListItem[]): ListItem[] {
    return tree
      .filter((item) => !targetIds.has(item.id))
      .map((item) => ({
        ...item,
        children: removeFromTree(item.children),
      }))
  }

  return removeFromTree(items)
}

/**
 * ノード数をカウント
 */
export function countNodes(items: ListItem[]): number {
  let count = 0

  function traverse(item: ListItem): void {
    count++
    item.children.forEach(traverse)
  }

  items.forEach(traverse)
  return count
}
