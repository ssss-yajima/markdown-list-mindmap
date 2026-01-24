import type { MindMapNode } from '../types/mindMap'

/**
 * カーソル位置から行番号を算出し、対応するノードIDを返す
 */
export function getNodeIdFromCursor(
  text: string,
  cursorPos: number,
  nodes: MindMapNode[]
): string | null {
  // カーソル位置から行番号を計算（1-indexed）
  const lineNumber = text.slice(0, cursorPos).split('\n').length

  // 行番号に対応するノードを検索
  const node = nodes.find((n) => n.data.lineNumber === lineNumber)
  return node?.id ?? null
}
