/**
 * ツリー構造をマークダウンに変換するユーティリティ
 */

import type { ListItem } from '../types/markdown';
import { embedId } from './idManager';

interface ConversionOptions {
  /** IDコメントを埋め込むかどうか（デフォルト: true） */
  embedIds?: boolean;
  /** インデントに使用する文字列（デフォルト: 2スペース） */
  indent?: string;
  /** リストマーカー（デフォルト: '-'） */
  marker?: string;
}

const DEFAULT_OPTIONS: Required<ConversionOptions> = {
  embedIds: true,
  indent: '  ',
  marker: '-',
};

/**
 * 単一のListItemをマークダウン行に変換
 */
function itemToLine(
  item: ListItem,
  depth: number,
  options: Required<ConversionOptions>
): string {
  const indentation = options.indent.repeat(depth);
  const marker = item.listType === 'ordered' ? '1.' : options.marker;
  const text = options.embedIds ? embedId(item.text, item.id) : item.text;
  return `${indentation}${marker} ${text}`;
}

/**
 * ListItemツリーを再帰的にマークダウン行の配列に変換
 */
function treeToLines(
  items: ListItem[],
  depth: number,
  options: Required<ConversionOptions>
): string[] {
  const lines: string[] = [];

  for (const item of items) {
    lines.push(itemToLine(item, depth, options));
    if (item.children.length > 0) {
      lines.push(...treeToLines(item.children, depth + 1, options));
    }
  }

  return lines;
}

/**
 * ListItemのツリーをマークダウン文字列に変換
 * @param items - ListItemの配列（ルートレベル）
 * @param options - 変換オプション
 * @returns マークダウン文字列
 */
export function treeToMarkdown(
  items: ListItem[],
  options: ConversionOptions = {}
): string {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const lines = treeToLines(items, 0, mergedOptions);
  return lines.join('\n');
}

/**
 * 単一のノードとその位置情報からマークダウンを更新
 * 既存のマークダウンの特定ノードのテキストを更新する
 */
export function updateNodeTextInMarkdown(
  markdown: string,
  nodeId: string,
  newText: string
): string {
  const lines = markdown.split('\n');
  const idPattern = new RegExp(`<!--\\s*id:${nodeId}\\s*-->`);

  for (let i = 0; i < lines.length; i++) {
    if (idPattern.test(lines[i])) {
      // リストアイテムのパターンにマッチさせて、テキスト部分だけを置換
      const match = lines[i].match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
      if (match) {
        const [, indent, marker] = match;
        lines[i] = `${indent}${marker} ${newText} <!-- id:${nodeId} -->`;
      }
      break;
    }
  }

  return lines.join('\n');
}
