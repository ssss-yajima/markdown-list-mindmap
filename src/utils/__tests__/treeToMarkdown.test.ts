import { describe, it, expect } from 'vitest'
import { treeToMarkdown, updateNodeTextInMarkdown } from '../treeToMarkdown'
import { parseMarkdown } from '../markdownParser'
import type { ListItem } from '../../types/markdown'

function makeItems(): ListItem[] {
  return [
    {
      id: 'a1',
      text: 'Root',
      level: 0,
      lineNumber: 1,
      listType: 'unordered',
      children: [
        {
          id: 'b1',
          text: 'Child1',
          level: 1,
          lineNumber: 2,
          listType: 'unordered',
          children: [],
        },
        {
          id: 'b2',
          text: 'Child2',
          level: 1,
          lineNumber: 3,
          listType: 'ordered',
          children: [],
        },
      ],
    },
  ]
}

describe('treeToMarkdown', () => {
  it('ID埋め込みありで変換する', () => {
    const items = makeItems()
    const md = treeToMarkdown(items, { embedIds: true })
    expect(md).toContain('<!-- id:a1 -->')
    expect(md).toContain('<!-- id:b1 -->')
    expect(md).toContain('<!-- id:b2 -->')
  })

  it('ID埋め込みなしで変換する', () => {
    const items = makeItems()
    const md = treeToMarkdown(items, { embedIds: false })
    expect(md).not.toContain('<!-- id:')
    expect(md).toBe('- Root\n  - Child1\n  1. Child2')
  })

  it('インデントを正しく反映する', () => {
    const items = makeItems()
    const md = treeToMarkdown(items, { embedIds: false })
    const lines = md.split('\n')
    expect(lines[0]).toBe('- Root')
    expect(lines[1]).toBe('  - Child1')
    expect(lines[2]).toBe('  1. Child2')
  })

  it('orderedリストのマーカーを使用する', () => {
    const items = makeItems()
    const md = treeToMarkdown(items, { embedIds: false })
    expect(md).toContain('1. Child2')
  })

  it('カスタムマーカーを使用する', () => {
    const items: ListItem[] = [{
      id: 'a1',
      text: 'Item',
      level: 0,
      lineNumber: 1,
      listType: 'unordered',
      children: [],
    }]
    const md = treeToMarkdown(items, { embedIds: false, marker: '*' })
    expect(md).toBe('* Item')
  })

  it('空配列は空文字列を返す', () => {
    expect(treeToMarkdown([])).toBe('')
  })
})

describe('treeToMarkdown ラウンドトリップ', () => {
  it('parse → treeToMarkdown → parse が等価', () => {
    const md = '- Root <!-- id:a1 -->\n  - Child1 <!-- id:b1 -->\n  - Child2 <!-- id:b2 -->'
    const parsed1 = parseMarkdown(md)
    const regenerated = treeToMarkdown(parsed1.items, { embedIds: true })
    const parsed2 = parseMarkdown(regenerated)

    expect(parsed2.items).toHaveLength(parsed1.items.length)
    expect(parsed2.items[0].id).toBe(parsed1.items[0].id)
    expect(parsed2.items[0].text).toBe(parsed1.items[0].text)
    expect(parsed2.items[0].children).toHaveLength(parsed1.items[0].children.length)
    expect(parsed2.items[0].children[0].id).toBe(parsed1.items[0].children[0].id)
    expect(parsed2.items[0].children[1].id).toBe(parsed1.items[0].children[1].id)
  })
})

describe('updateNodeTextInMarkdown', () => {
  it('特定ノードのテキストを更新する', () => {
    const md = '- Root <!-- id:a1 -->\n  - Child1 <!-- id:b1 -->'
    const result = updateNodeTextInMarkdown(md, 'b1', 'UpdatedChild')
    expect(result).toContain('UpdatedChild <!-- id:b1 -->')
    expect(result).toContain('Root <!-- id:a1 -->')
  })

  it('存在しないIDの場合は変更なし', () => {
    const md = '- Root <!-- id:a1 -->'
    const result = updateNodeTextInMarkdown(md, 'nonexistent', 'NewText')
    expect(result).toBe(md)
  })
})
