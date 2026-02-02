import { describe, it, expect } from 'vitest'
import { getNodeIdFromCursor } from '../cursorToNodeId'
import type { MindMapNode } from '../../types/mindMap'

function makeNodes(): MindMapNode[] {
  return [
    {
      id: 'node1',
      type: 'mindmap',
      position: { x: 0, y: 0 },
      data: {
        label: 'First Item',
        level: 0,
        hasChildren: true,
        expanded: true,
        lineNumber: 1,
      },
    },
    {
      id: 'node2',
      type: 'mindmap',
      position: { x: 100, y: 0 },
      data: {
        label: 'Second Item',
        level: 1,
        hasChildren: false,
        expanded: true,
        lineNumber: 2,
      },
    },
    {
      id: 'node3',
      type: 'mindmap',
      position: { x: 100, y: 50 },
      data: {
        label: 'Third Item',
        level: 1,
        hasChildren: false,
        expanded: true,
        lineNumber: 3,
      },
    },
  ]
}

describe('getNodeIdFromCursor', () => {
  const text = '- First Item\n  - Second Item\n  - Third Item'

  it('最初の行のカーソル位置からノードIDを取得する', () => {
    const nodes = makeNodes()
    // カーソルが1行目の中にある場合
    const result = getNodeIdFromCursor(text, 5, nodes)
    expect(result).toBe('node1')
  })

  it('2行目のカーソル位置からノードIDを取得する', () => {
    const nodes = makeNodes()
    // カーソルが2行目の中にある場合
    const cursorPos = text.indexOf('Second')
    const result = getNodeIdFromCursor(text, cursorPos, nodes)
    expect(result).toBe('node2')
  })

  it('3行目のカーソル位置からノードIDを取得する', () => {
    const nodes = makeNodes()
    // カーソルが3行目の中にある場合
    const cursorPos = text.indexOf('Third')
    const result = getNodeIdFromCursor(text, cursorPos, nodes)
    expect(result).toBe('node3')
  })

  it('行の先頭にカーソルがある場合', () => {
    const nodes = makeNodes()
    // 1行目の先頭
    const result = getNodeIdFromCursor(text, 0, nodes)
    expect(result).toBe('node1')
  })

  it('行の末尾にカーソルがある場合', () => {
    const nodes = makeNodes()
    // 1行目の末尾（改行の直前）
    const cursorPos = text.indexOf('\n')
    const result = getNodeIdFromCursor(text, cursorPos, nodes)
    expect(result).toBe('node1')
  })

  it('テキストの最後にカーソルがある場合', () => {
    const nodes = makeNodes()
    // テキストの最後
    const result = getNodeIdFromCursor(text, text.length, nodes)
    expect(result).toBe('node3')
  })

  it('空のノード配列の場合はnullを返す', () => {
    const result = getNodeIdFromCursor(text, 5, [])
    expect(result).toBeNull()
  })

  it('対応するノードがない場合はnullを返す', () => {
    const nodes = makeNodes()
    // 4行目に相当する位置（存在しない行）
    const textWith4Lines = '- Line1\n- Line2\n- Line3\n- Line4'
    const result = getNodeIdFromCursor(
      textWith4Lines,
      textWith4Lines.length,
      nodes,
    )
    expect(result).toBeNull()
  })

  it('空文字列の場合', () => {
    const nodes = makeNodes()
    const result = getNodeIdFromCursor('', 0, nodes)
    expect(result).toBe('node1') // 行番号1に対応するノードを返す
  })

  it('複数の改行がある場合の行番号計算', () => {
    const multiLineText = '- Line1\n- Line2\n- Line3'
    const nodesWithLines: MindMapNode[] = [
      {
        id: 'a',
        type: 'mindmap',
        position: { x: 0, y: 0 },
        data: {
          label: 'Line1',
          level: 0,
          hasChildren: false,
          expanded: true,
          lineNumber: 1,
        },
      },
      {
        id: 'b',
        type: 'mindmap',
        position: { x: 0, y: 50 },
        data: {
          label: 'Line2',
          level: 0,
          hasChildren: false,
          expanded: true,
          lineNumber: 2,
        },
      },
      {
        id: 'c',
        type: 'mindmap',
        position: { x: 0, y: 100 },
        data: {
          label: 'Line3',
          level: 0,
          hasChildren: false,
          expanded: true,
          lineNumber: 3,
        },
      },
    ]

    // 2行目の開始位置
    const line2Start = multiLineText.indexOf('- Line2')
    const result = getNodeIdFromCursor(
      multiLineText,
      line2Start,
      nodesWithLines,
    )
    expect(result).toBe('b')
  })

  it('改行直後のカーソル位置', () => {
    const nodes = makeNodes()
    // 改行の直後（2行目の開始）
    const cursorPos = text.indexOf('\n') + 1
    const result = getNodeIdFromCursor(text, cursorPos, nodes)
    expect(result).toBe('node2')
  })
})
