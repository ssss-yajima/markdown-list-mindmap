import { describe, it, expect } from 'vitest'
import {
  buildContentMapFromItems,
  calculateLayout,
  resolveOverlaps,
  relayoutSubtree,
} from '../layoutEngine'
import type { ListItem } from '../../types/markdown'
import type { NodeMetadata } from '../../types/mindMap'

function makeListItem(
  id: string,
  text: string,
  level: number,
  lineNumber: number,
  children: ListItem[] = [],
): ListItem {
  return { id, text, level, lineNumber, listType: 'unordered', children }
}

function makeItems(): ListItem[] {
  return [
    makeListItem('root1', 'Root', 0, 1, [
      makeListItem('child1', 'Child1', 1, 2),
      makeListItem('child2', 'Child2', 1, 3),
    ]),
  ]
}

function makeItemsWithBranches(): ListItem[] {
  return [
    makeListItem('root', 'Root', 0, 1, [
      makeListItem('branch1', 'Branch1', 1, 2, [
        makeListItem('branch1-child', 'Branch1 Child', 2, 3),
      ]),
      makeListItem('branch2', 'Branch2', 1, 4),
    ]),
  ]
}

function makeBranchMetadata(): Record<string, NodeMetadata> {
  return {
    root: { id: 'root', position: { x: 0, y: 0 }, expanded: true },
    branch1: {
      id: 'branch1',
      position: { x: 280, y: 0 },
      expanded: true,
      direction: 'right',
    },
    'branch1-child': {
      id: 'branch1-child',
      position: { x: 560, y: 0 },
      expanded: true,
    },
    branch2: {
      id: 'branch2',
      position: { x: 280, y: 50 },
      expanded: true,
      direction: 'right',
    },
  }
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
    const items: ListItem[] = [
      makeListItem('a', 'A', 0, 1, [
        makeListItem('b', 'B', 1, 2, [makeListItem('c', 'C', 2, 3)]),
      ]),
    ]
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
    const items: ListItem[] = [makeListItem('single', 'Single', 0, 1)]
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

describe('calculateLayout - direction handling', () => {
  function makeItemsWithDirections(): ListItem[] {
    return [
      makeListItem('root', 'Root', 0, 1, [
        makeListItem('left1', 'Left1', 1, 2, [
          makeListItem('left1-child', 'Left1 Child', 2, 3),
        ]),
        makeListItem('right1', 'Right1', 1, 4),
      ]),
    ]
  }

  it('左向きノードは負のX座標を持つ', () => {
    const items = makeItemsWithDirections()
    const result = calculateLayout(items, {}, undefined, { left1: 'left' })

    expect(result.left1.position.x).toBeLessThan(0)
    expect(result.left1.direction).toBe('left')
  })

  it('右向きノードは正のX座標を持つ', () => {
    const items = makeItemsWithDirections()
    const result = calculateLayout(items, {}, undefined, { right1: 'right' })

    expect(result.right1.position.x).toBeGreaterThan(0)
  })

  it('左向きサブツリーの子も負のX座標を持つ', () => {
    const items = makeItemsWithDirections()
    const result = calculateLayout(items, {}, undefined, { left1: 'left' })

    expect(result['left1-child'].position.x).toBeLessThan(
      result.left1.position.x,
    )
  })

  it('既存メタデータのdirectionを保持する', () => {
    const items = makeItemsWithDirections()
    const existing: Record<string, NodeMetadata> = {
      left1: {
        id: 'left1',
        position: { x: -280, y: 0 },
        expanded: true,
        direction: 'left',
      },
    }
    const result = calculateLayout(items, existing)

    expect(result.left1.direction).toBe('left')
    expect(result.left1.position.x).toBe(-280)
  })

  it('ルートノードはdirectionを持たない', () => {
    const items = makeItemsWithDirections()
    const result = calculateLayout(items, {})

    expect(result.root.direction).toBeUndefined()
  })
})

describe('relayoutSubtree', () => {
  it('指定ノードの方向を変更する', () => {
    const items = makeItemsWithBranches()
    const existing = makeBranchMetadata()

    const result = relayoutSubtree('branch1', 'left', items, existing)

    expect(result.branch1.direction).toBe('left')
    expect(result.branch1.position.x).toBeLessThan(0)
  })

  it('サブツリー全体が新しい方向にレイアウトされる', () => {
    const items = makeItemsWithBranches()
    const existing = makeBranchMetadata()

    const result = relayoutSubtree('branch1', 'left', items, existing)

    expect(result.branch1.position.x).toBeLessThan(0)
    expect(result['branch1-child'].position.x).toBeLessThan(
      result.branch1.position.x,
    )
  })

  it('他のブランチには影響しない', () => {
    const items = makeItemsWithBranches()
    const existing = makeBranchMetadata()

    const result = relayoutSubtree('branch1', 'left', items, existing)

    expect(result.branch2.position.x).toBeGreaterThan(0)
  })

  it('存在しないノードIDの場合は元のメタデータを返す', () => {
    const items = makeItemsWithBranches()
    const existing: Record<string, NodeMetadata> = {
      root: { id: 'root', position: { x: 0, y: 0 }, expanded: true },
    }

    const result = relayoutSubtree('nonexistent', 'left', items, existing)

    expect(result).toEqual(existing)
  })
})
