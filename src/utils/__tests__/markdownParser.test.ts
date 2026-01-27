import { describe, it, expect } from 'vitest'
import {
  parseMarkdown,
  parseAndEnsureIds,
  syncMarkdownWithTree,
} from '../markdownParser'
import type { ListItem } from '../../types/markdown'

describe('parseMarkdown', () => {
  it('フラットリストをパースする', () => {
    const md = '- Item1\n- Item2\n- Item3'
    const result = parseMarkdown(md)
    expect(result.items).toHaveLength(3)
    expect(result.items[0].text).toBe('Item1')
    expect(result.items[1].text).toBe('Item2')
    expect(result.items[2].text).toBe('Item3')
    expect(result.items[0].level).toBe(0)
  })

  it('ネストリストをパースする', () => {
    const md = '- Parent\n  - Child1\n  - Child2\n    - Grandchild'
    const result = parseMarkdown(md)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].text).toBe('Parent')
    expect(result.items[0].children).toHaveLength(2)
    expect(result.items[0].children[0].text).toBe('Child1')
    expect(result.items[0].children[1].text).toBe('Child2')
    expect(result.items[0].children[1].children).toHaveLength(1)
    expect(result.items[0].children[1].children[0].text).toBe('Grandchild')
  })

  it('ordered/unordered混在をパースする', () => {
    const md = '- Unordered\n1. Ordered'
    const result = parseMarkdown(md)
    expect(result.items).toHaveLength(2)
    expect(result.items[0].listType).toBe('unordered')
    expect(result.items[1].listType).toBe('ordered')
  })

  it('空文字列を処理する', () => {
    const result = parseMarkdown('')
    expect(result.items).toHaveLength(0)
  })

  it('リスト以外の行を無視する', () => {
    const md = '# Title\n- Item1\nsome text\n- Item2'
    const result = parseMarkdown(md)
    expect(result.items).toHaveLength(2)
    expect(result.items[0].text).toBe('Item1')
    expect(result.items[1].text).toBe('Item2')
  })

  it('タブインデントをサポートする', () => {
    const md = '- Parent\n\t\t- Child'
    const result = parseMarkdown(md)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].children).toHaveLength(1)
  })

  it('IDコメント付きテキストをパースする', () => {
    const md = '- Item1 <!-- id:abc12345 -->\n  - Child <!-- id:def67890 -->'
    const result = parseMarkdown(md)
    expect(result.items[0].id).toBe('abc12345')
    expect(result.items[0].text).toBe('Item1')
    expect(result.items[0].children[0].id).toBe('def67890')
    expect(result.items[0].children[0].text).toBe('Child')
  })

  it('深いネストを正しくパースする', () => {
    const md = '- L0\n  - L1\n    - L2\n      - L3\n        - L4'
    const result = parseMarkdown(md)
    let node = result.items[0]
    for (let i = 1; i <= 4; i++) {
      expect(node.children).toHaveLength(1)
      node = node.children[0]
    }
    expect(node.children).toHaveLength(0)
  })

  it('行番号を正しく設定する', () => {
    const md = '- Item1\n- Item2\n  - Child'
    const result = parseMarkdown(md)
    expect(result.items[0].lineNumber).toBe(1)
    expect(result.items[1].lineNumber).toBe(2)
    expect(result.items[1].children[0].lineNumber).toBe(3)
  })

  it('異なるマーカー(*, +)をサポートする', () => {
    const md = '* Star\n+ Plus\n- Dash'
    const result = parseMarkdown(md)
    expect(result.items).toHaveLength(3)
    expect(result.items[0].text).toBe('Star')
    expect(result.items[1].text).toBe('Plus')
    expect(result.items[2].text).toBe('Dash')
  })
})

describe('parseAndEnsureIds', () => {
  it('IDがない行にIDを付与する', () => {
    const md = '- Item1\n- Item2'
    const result = parseAndEnsureIds(md)
    expect(result.hasChanges).toBe(true)
    expect(result.markdownWithIds).toContain('<!-- id:')
    expect(result.parsed.items[0].id).toMatch(/^[a-z0-9]{8}$/)
  })

  it('既存IDを保持する', () => {
    const md = '- Item1 <!-- id:existing1 -->\n- Item2 <!-- id:existing2 -->'
    const result = parseAndEnsureIds(md)
    expect(result.hasChanges).toBe(false)
    expect(result.parsed.items[0].id).toBe('existing1')
    expect(result.parsed.items[1].id).toBe('existing2')
  })

  it('混在ケース: 既存IDを保持し、新しいIDを付与する', () => {
    const md = '- Item1 <!-- id:existing1 -->\n- Item2'
    const result = parseAndEnsureIds(md)
    expect(result.hasChanges).toBe(true)
    expect(result.parsed.items[0].id).toBe('existing1')
    expect(result.parsed.items[1].id).toMatch(/^[a-z0-9]{8}$/)
  })
})

describe('syncMarkdownWithTree', () => {
  it('既存ツリーとの同期でIDを保持する', () => {
    const existingItems: ListItem[] = [
      { id: 'keep1', text: 'Item1', level: 0, lineNumber: 1, listType: 'unordered', children: [] },
      { id: 'keep2', text: 'Item2', level: 0, lineNumber: 2, listType: 'unordered', children: [] },
    ]
    const newMarkdown = '- Item1\n- Item2'

    const result = syncMarkdownWithTree(newMarkdown, existingItems)
    expect(result.parsed.items[0].id).toBe('keep1')
    expect(result.parsed.items[1].id).toBe('keep2')
    expect(result.markdownWithIds).toContain('keep1')
    expect(result.markdownWithIds).toContain('keep2')
  })

  it('新規行にはIDを付与する', () => {
    const existingItems: ListItem[] = [
      { id: 'keep1', text: 'Item1', level: 0, lineNumber: 1, listType: 'unordered', children: [] },
    ]
    const newMarkdown = '- Item1\n- NewItem'

    const result = syncMarkdownWithTree(newMarkdown, existingItems)
    expect(result.parsed.items[0].id).toBe('keep1')
    expect(result.parsed.items[1].id).toMatch(/^[a-z0-9]{8}$/)
  })

  it('既存ツリーがnullの場合は通常のパース', () => {
    const result = syncMarkdownWithTree('- Item1', null)
    expect(result.parsed.items).toHaveLength(1)
    expect(result.markdownWithIds).toContain('<!-- id:')
  })

  it('既存ツリーが空配列の場合は通常のパース', () => {
    const result = syncMarkdownWithTree('- Item1', [])
    expect(result.parsed.items).toHaveLength(1)
    expect(result.markdownWithIds).toContain('<!-- id:')
  })
})
