import { describe, it, expect } from 'vitest'
import {
  generateId,
  extractId,
  removeIdComment,
  embedId,
  ensureId,
  matchNodes,
} from '../idManager'

describe('generateId', () => {
  it('8文字の英数字を生成する', () => {
    const id = generateId()
    expect(id).toMatch(/^[a-z0-9]{8}$/)
  })

  it('毎回異なるIDを生成する', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()))
    expect(ids.size).toBe(100)
  })
})

describe('extractId', () => {
  it('IDコメントからIDを抽出する', () => {
    expect(extractId('テスト <!-- id:abc12345 -->')).toBe('abc12345')
  })

  it('スペースの有無に関わらず抽出できる', () => {
    expect(extractId('テスト <!--id:abc12345-->')).toBe('abc12345')
    expect(extractId('テスト <!--  id:abc12345  -->')).toBe('abc12345')
  })

  it('IDがない場合はnullを返す', () => {
    expect(extractId('テスト')).toBeNull()
    expect(extractId('')).toBeNull()
  })

  it('通常のHTMLコメントはIDとして扱わない', () => {
    expect(extractId('テスト <!-- コメント -->')).toBeNull()
  })
})

describe('removeIdComment', () => {
  it('IDコメントを除去する', () => {
    expect(removeIdComment('テスト <!-- id:abc12345 -->')).toBe('テスト')
  })

  it('IDがない場合はそのまま返す', () => {
    expect(removeIdComment('テスト')).toBe('テスト')
  })

  it('前後の空白をトリムする', () => {
    expect(removeIdComment('  テスト <!-- id:abc12345 -->  ')).toBe('テスト')
  })
})

describe('embedId', () => {
  it('テキスト末尾にIDコメントを追加する', () => {
    expect(embedId('テスト', 'abc12345')).toBe('テスト <!-- id:abc12345 -->')
  })

  it('既存のIDコメントを置換する', () => {
    expect(embedId('テスト <!-- id:old00000 -->', 'new11111')).toBe(
      'テスト <!-- id:new11111 -->',
    )
  })
})

describe('ensureId', () => {
  it('IDがない場合は新規生成して埋め込む', () => {
    const result = ensureId('テスト')
    expect(result.id).toMatch(/^[a-z0-9]{8}$/)
    expect(result.text).toContain('<!-- id:')
    expect(result.text).toContain(result.id)
  })

  it('既存IDがある場合はそのまま保持する', () => {
    const text = 'テスト <!-- id:existing -->'
    const result = ensureId(text)
    expect(result.id).toBe('existing')
    expect(result.text).toBe(text)
  })
})

describe('matchNodes', () => {
  it('同じテキスト・親・兄弟位置で完全マッチする', () => {
    const oldItems = [
      { id: 'a1', text: 'Root', level: 0, children: [
        { id: 'b1', text: 'Child1', level: 1, children: [] },
        { id: 'b2', text: 'Child2', level: 1, children: [] },
      ] },
    ]
    const newItems = [
      { text: 'Root', level: 0, children: [
        { text: 'Child1', level: 1, children: [] },
        { text: 'Child2', level: 1, children: [] },
      ] },
    ]

    const result = matchNodes(oldItems, newItems)
    expect(result.get(0)).toBe('a1')
    expect(result.get(1)).toBe('b1')
    expect(result.get(2)).toBe('b2')
  })

  it('テキスト+親テキストでマッチする（兄弟位置が異なる場合）', () => {
    const oldItems = [
      { id: 'a1', text: 'Root', level: 0, children: [
        { id: 'b1', text: 'Child1', level: 1, children: [] },
        { id: 'b2', text: 'Child2', level: 1, children: [] },
      ] },
    ]
    // Child1とChild2の位置が入れ替わった
    const newItems = [
      { text: 'Root', level: 0, children: [
        { text: 'Child2', level: 1, children: [] },
        { text: 'Child1', level: 1, children: [] },
      ] },
    ]

    const result = matchNodes(oldItems, newItems)
    // Pass 1 では位置が合わないため、Pass 2 で親テキストマッチ
    expect(result.get(0)).toBe('a1')
    expect(result.get(1)).toBe('b2')
    expect(result.get(2)).toBe('b1')
  })

  it('テキスト+レベルでマッチする（親が異なる場合）', () => {
    const oldItems = [
      { id: 'a1', text: 'Root1', level: 0, children: [
        { id: 'b1', text: 'Shared', level: 1, children: [] },
      ] },
      { id: 'a2', text: 'Root2', level: 0, children: [] },
    ]
    const newItems = [
      { text: 'Root1', level: 0, children: [] },
      { text: 'Root2', level: 0, children: [
        { text: 'Shared', level: 1, children: [] },
      ] },
    ]

    const result = matchNodes(oldItems, newItems)
    expect(result.get(0)).toBe('a1')
    expect(result.get(1)).toBe('a2')
    // 'Shared' はPass 3でレベルマッチ
    expect(result.get(2)).toBe('b1')
  })

  it('マッチしない新規ノードはマップに含まれない', () => {
    const oldItems = [
      { id: 'a1', text: 'Root', level: 0, children: [] },
    ]
    const newItems = [
      { text: 'Root', level: 0, children: [] },
      { text: 'NewNode', level: 0, children: [] },
    ]

    const result = matchNodes(oldItems, newItems)
    expect(result.get(0)).toBe('a1')
    expect(result.has(1)).toBe(false)
  })
})
