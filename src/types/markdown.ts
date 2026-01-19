/**
 * パースされた箇条書きアイテム
 */
export interface ListItem {
  id: string
  text: string
  level: number
  lineNumber: number
  listType: 'unordered' | 'ordered'
  children: ListItem[]
}

/**
 * パース結果
 */
export interface ParsedMarkdown {
  items: ListItem[]
  rawText: string
}
