import type { ListItem, ParsedMarkdown } from '../types/markdown';
import { extractId, removeIdComment, generateId, embedId } from './idManager';

const LIST_ITEM_REGEX = /^(\s*)([-*+]|\d+\.)\s+(.+)$/;

interface RawListItem {
  text: string;
  cleanText: string;
  id: string | null;
  indent: number;
  listType: 'unordered' | 'ordered';
  lineNumber: number;
}

function calculateIndentLevel(indent: string): number {
  const spaces = indent.replace(/\t/g, '    ').length;
  return Math.floor(spaces / 2);
}

function tokenize(markdown: string): RawListItem[] {
  const lines = markdown.split('\n');
  const items: RawListItem[] = [];

  lines.forEach((line, index) => {
    const match = line.match(LIST_ITEM_REGEX);
    if (match) {
      const [, indent, marker, text] = match;
      const id = extractId(text);
      const cleanText = removeIdComment(text);

      items.push({
        text: text.trim(),
        cleanText,
        id,
        indent: calculateIndentLevel(indent),
        listType: /^\d+\.$/.test(marker) ? 'ordered' : 'unordered',
        lineNumber: index + 1,
      });
    }
  });

  return items;
}

function buildTree(items: RawListItem[]): ListItem[] {
  const root: ListItem[] = [];
  const stack: { item: ListItem; level: number }[] = [];

  items.forEach((raw) => {
    const item: ListItem = {
      id: raw.id ?? generateId(),
      text: raw.cleanText,
      level: raw.indent,
      lineNumber: raw.lineNumber,
      listType: raw.listType,
      children: [],
    };

    while (stack.length > 0 && stack[stack.length - 1].level >= raw.indent) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(item);
    } else {
      stack[stack.length - 1].item.children.push(item);
    }

    stack.push({ item, level: raw.indent });
  });

  return root;
}

/**
 * マークダウンをパースしてListItemツリーを生成
 */
export function parseMarkdown(markdown: string): ParsedMarkdown {
  const tokens = tokenize(markdown);
  const items = buildTree(tokens);

  return {
    items,
    rawText: markdown,
  };
}

/**
 * マークダウンをパースし、IDがないノードにIDを付与したマークダウンも返す
 * 双方向同期用に、IDを持つマークダウンを返す
 */
export function parseAndEnsureIds(markdown: string): {
  parsed: ParsedMarkdown;
  markdownWithIds: string;
  hasChanges: boolean;
} {
  const lines = markdown.split('\n');
  const newLines: string[] = [];
  let hasChanges = false;

  lines.forEach((line) => {
    const match = line.match(LIST_ITEM_REGEX);
    if (match) {
      const [, indent, marker, text] = match;
      const existingId = extractId(text);

      if (existingId) {
        newLines.push(line);
      } else {
        const newId = generateId();
        const newText = embedId(text.trim(), newId);
        newLines.push(`${indent}${marker} ${newText}`);
        hasChanges = true;
      }
    } else {
      newLines.push(line);
    }
  });

  const markdownWithIds = newLines.join('\n');
  const parsed = parseMarkdown(markdownWithIds);

  return {
    parsed,
    markdownWithIds,
    hasChanges,
  };
}

/**
 * ListItemツリーからIDのマッピングを取得
 */
export function getIdMapping(items: ListItem[]): Map<string, ListItem> {
  const map = new Map<string, ListItem>();

  function traverse(item: ListItem): void {
    map.set(item.id, item);
    item.children.forEach(traverse);
  }

  items.forEach(traverse);
  return map;
}

/**
 * 特定のIDを持つノードを検索
 */
export function findNodeById(items: ListItem[], id: string): ListItem | null {
  for (const item of items) {
    if (item.id === id) return item;
    const found = findNodeById(item.children, id);
    if (found) return found;
  }
  return null;
}

/**
 * 特定のIDを持つノードの親を検索
 */
export function findParentNode(
  items: ListItem[],
  id: string,
  parent: ListItem | null = null
): ListItem | null {
  for (const item of items) {
    if (item.id === id) return parent;
    const found = findParentNode(item.children, id, item);
    if (found !== null) return found;
  }
  return null;
}
