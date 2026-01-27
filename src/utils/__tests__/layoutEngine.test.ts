import { describe, it, expect } from 'vitest'
import {
  buildContentMapFromItems,
  calculateLayout,
  resolveOverlaps,
} from '../layoutEngine'
import type { ListItem } from '../../types/markdown'
import type { NodeMetadata } from '../../types/mindMap'

function makeItems(): ListItem[] {
  return [
    {
      id: 'root1',
      text: 'Root',
      level: 0,
      lineNumber: 1,
      listType: 'unordered',
      children: [
        {
          id: 'child1',
          text: 'Child1',
          level: 1,
          lineNumber: 2,
          listType: 'unordered',
          children: [],
        },
        {
          id: 'child2',
          text: 'Child2',
          level: 1,
          lineNumber: 3,
          listType: 'unordered',
          children: [],
        },
      ],
    },
  ]
}

describe('buildContentMapFromItems', () => {
  it('ID→テキストのマップを生成する', () => {
    const items = makeItems()
    const map = buildContentMapFromItems(items)
    expect(map.root1).toBe('Root')
    expect(map.child1).toBe('Child1')
    expect(map.child2).toBe('Child2')
  })

  it('空配列は空オブジェクトを返す', () => {
    expect(buildContentMapFromItems([])).toEqual({})
  })

  it('深いネストのノードも含む', () => {
    const items: ListItem[] = [{
      id: 'a', text: 'A', level: 0, lineNumber: 1, listType: 'unordered',
      children: [{
        id: 'b', text: 'B', level: 1, lineNumber: 2, listType: 'unordered',
        children: [{
          id: 'c', text: 'C', level: 2, lineNumber: 3, listType: 'unordered',
          children: [],
        }],
      }],
    }]
    const map = buildContentMapFromItems(items)
    expect(Object.keys(map)).toHaveLength(3)
    expect(map.c).toBe('C')
  })
})

describe('calculateLayout', () => {
  it('基本配置: ノードにposition情報を付与する', () => {
    const items = makeItems()
    const result = calculateLayout(items, {})

    expect(result.root1).toBeDefined()
    expect(result.child1).toBeDefined()
    expect(result.child2).toBeDefined()
    expect(result.root1.position).toBeDefined()
    expect(result.child1.position).toBeDefined()
  })

  it('深さに応じたX座標を設定する', () => {
    const items = makeItems()
    const result = calculateLayout(items, {})

    expect(result.root1.position.x).toBeLessThan(result.child1.position.x)
    expect(result.child1.position.x).toBe(result.child2.position.x)
  })

  it('単一ノードの場合', () => {
    const items: ListItem[] = [{
      id: 'single', text: 'Single', level: 0, lineNumber: 1,
      listType: 'unordered', children: [],
    }]
    const result = calculateLayout(items, {})
    expect(result.single).toBeDefined()
    expect(result.single.position.x).toBe(0)
  })

  it('既存メタデータを保持する', () => {
    const items = makeItems()
    const existing: Record<string, NodeMetadata> = {
      root1: { id: 'root1', position: { x: 500, y: 500 }, expanded: true },
    }
    const result = calculateLayout(items, existing)
    expect(result.root1.position.x).toBe(500)
    expect(result.root1.position.y).toBe(500)
  })

  it('全ノードのexpandedがtrueに設定される', () => {
    const items = makeItems()
    const result = calculateLayout(items, {})
    for (const meta of Object.values(result)) {
      expect(meta.expanded).toBe(true)
    }
  })
})

describe('resolveOverlaps', () => {
  it('重なるノードを分離する', () => {
    const metadata: Record<string, NodeMetadata> = {
      a: { id: 'a', position: { x: 0, y: 0 }, expanded: true },
      b: { id: 'b', position: { x: 0, y: 10 }, expanded: true },
    }
    const contentMap = { a: 'A', b: 'B' }
    const result = resolveOverlaps(metadata, contentMap)

    // bがaの下に移動されているはず
    expect(result.b.position.y).toBeGreaterThan(result.a.position.y)
  })

  it('重なりがない場合は変更しない', () => {
    const metadata: Record<string, NodeMetadata> = {
      a: { id: 'a', position: { x: 0, y: 0 }, expanded: true },
      b: { id: 'b', position: { x: 0, y: 500 }, expanded: true },
    }
    const result = resolveOverlaps(metadata)
    expect(result.a.position.y).toBe(0)
    expect(result.b.position.y).toBe(500)
  })

  it('異なるX座標のノードは衝突チェックしない', () => {
    const metadata: Record<string, NodeMetadata> = {
      a: { id: 'a', position: { x: 0, y: 0 }, expanded: true },
      b: { id: 'b', position: { x: 1000, y: 0 }, expanded: true },
    }
    const result = resolveOverlaps(metadata)
    // 異なる階層なので位置は変わらない
    expect(result.a.position.y).toBe(0)
    expect(result.b.position.y).toBe(0)
  })
})
