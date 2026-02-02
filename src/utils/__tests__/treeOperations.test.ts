import { describe, it, expect } from 'vitest'
import {
  findNode,
  findParent,
  findSiblings,
  addChildNode,
  addSiblingNode,
  addSiblingNodeBefore,
  deleteNode,
  deleteNodes,
  updateNodeText,
  moveNode,
  cloneTree,
  filterRedundantNodes,
  recalculateLineNumbers,
  getAllNodeIds,
  countNodes,
} from '../treeOperations'
import type { ListItem } from '../../types/markdown'

function makeTree(): ListItem[] {
  return [
    {
      id: 'root1',
      text: 'Root1',
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
          children: [
            {
              id: 'grandchild1',
              text: 'GrandChild1',
              level: 2,
              lineNumber: 3,
              listType: 'unordered',
              children: [],
            },
          ],
        },
        {
          id: 'child2',
          text: 'Child2',
          level: 1,
          lineNumber: 4,
          listType: 'unordered',
          children: [],
        },
      ],
    },
    {
      id: 'root2',
      text: 'Root2',
      level: 0,
      lineNumber: 5,
      listType: 'unordered',
      children: [],
    },
  ]
}

describe('cloneTree', () => {
  it('ディープコピーを作成する', () => {
    const original = makeTree()
    const cloned = cloneTree(original)
    expect(cloned).toEqual(original)
    expect(cloned).not.toBe(original)
    expect(cloned[0]).not.toBe(original[0])
    expect(cloned[0].children[0]).not.toBe(original[0].children[0])
  })
})

describe('findNode', () => {
  it('ルートノードを見つける', () => {
    const tree = makeTree()
    const node = findNode(tree, 'root1')
    expect(node?.text).toBe('Root1')
  })

  it('深いノードを見つける', () => {
    const tree = makeTree()
    const node = findNode(tree, 'grandchild1')
    expect(node?.text).toBe('GrandChild1')
  })

  it('存在しないIDはnullを返す', () => {
    const tree = makeTree()
    expect(findNode(tree, 'nonexistent')).toBeNull()
  })
})

describe('findParent', () => {
  it('子ノードの親を見つける', () => {
    const tree = makeTree()
    const parent = findParent(tree, 'child1')
    expect(parent?.id).toBe('root1')
  })

  it('孫ノードの親を見つける', () => {
    const tree = makeTree()
    const parent = findParent(tree, 'grandchild1')
    expect(parent?.id).toBe('child1')
  })

  it('ルートノードの親はnull', () => {
    const tree = makeTree()
    expect(findParent(tree, 'root1')).toBeNull()
  })
})

describe('findSiblings', () => {
  it('兄弟リストとインデックスを返す', () => {
    const tree = makeTree()
    const result = findSiblings(tree, 'child2')
    expect(result).not.toBeNull()
    expect(result!.siblings).toHaveLength(2)
    expect(result!.index).toBe(1)
  })

  it('ルートレベルの兄弟を返す', () => {
    const tree = makeTree()
    const result = findSiblings(tree, 'root2')
    expect(result).not.toBeNull()
    expect(result!.siblings).toHaveLength(2)
    expect(result!.index).toBe(1)
  })

  it('存在しないIDはnullを返す', () => {
    const tree = makeTree()
    expect(findSiblings(tree, 'nonexistent')).toBeNull()
  })
})

describe('addChildNode', () => {
  it('子ノードを追加する', () => {
    const tree = makeTree()
    const { items, newNodeId } = addChildNode(tree, 'root2', 'NewChild')
    const parent = findNode(items, 'root2')
    expect(parent!.children).toHaveLength(1)
    expect(parent!.children[0].text).toBe('NewChild')
    expect(parent!.children[0].id).toBe(newNodeId)
    expect(parent!.children[0].level).toBe(1)
  })

  it('存在しない親IDでエラーを投げる', () => {
    const tree = makeTree()
    expect(() => addChildNode(tree, 'nonexistent')).toThrow(
      'Parent node not found',
    )
  })

  it('元のツリーを変更しない', () => {
    const tree = makeTree()
    const originalRoot2ChildCount = tree[1].children.length
    addChildNode(tree, 'root2', 'NewChild')
    expect(tree[1].children.length).toBe(originalRoot2ChildCount)
  })
})

describe('addSiblingNode', () => {
  it('指定ノードの直後に兄弟を追加する', () => {
    const tree = makeTree()
    const { items, newNodeId } = addSiblingNode(tree, 'child1', 'NewSibling')
    const result = findSiblings(items, newNodeId)
    expect(result).not.toBeNull()
    expect(result!.index).toBe(1)
    expect(result!.siblings[1].text).toBe('NewSibling')
    expect(result!.siblings).toHaveLength(3)
  })

  it('存在しないIDでエラーを投げる', () => {
    const tree = makeTree()
    expect(() => addSiblingNode(tree, 'nonexistent')).toThrow(
      'Sibling node not found',
    )
  })

  it('元のツリーを変更しない', () => {
    const tree = makeTree()
    const originalChildCount = tree[0].children.length
    addSiblingNode(tree, 'child1')
    expect(tree[0].children.length).toBe(originalChildCount)
  })
})

describe('addSiblingNodeBefore', () => {
  it('指定ノードの直前に兄弟を追加する', () => {
    const tree = makeTree()
    const { items, newNodeId } = addSiblingNodeBefore(tree, 'child2', 'Before')
    const result = findSiblings(items, newNodeId)
    expect(result).not.toBeNull()
    expect(result!.index).toBe(1)
    expect(result!.siblings[1].text).toBe('Before')
    expect(result!.siblings[2].id).toBe('child2')
  })
})

describe('deleteNode', () => {
  it('リーフノードを削除する', () => {
    const tree = makeTree()
    const items = deleteNode(tree, 'child2')
    expect(findNode(items, 'child2')).toBeNull()
    expect(findNode(items, 'root1')!.children).toHaveLength(1)
  })

  it('子持ちノードを削除する', () => {
    const tree = makeTree()
    const items = deleteNode(tree, 'child1')
    expect(findNode(items, 'child1')).toBeNull()
    expect(findNode(items, 'grandchild1')).toBeNull()
  })

  it('存在しないIDでエラーを投げる', () => {
    const tree = makeTree()
    expect(() => deleteNode(tree, 'nonexistent')).toThrow('Node not found')
  })

  it('元のツリーを変更しない', () => {
    const tree = makeTree()
    deleteNode(tree, 'child2')
    expect(tree[0].children).toHaveLength(2)
  })
})

describe('updateNodeText', () => {
  it('ノードのテキストを更新する', () => {
    const tree = makeTree()
    const items = updateNodeText(tree, 'child1', 'Updated')
    expect(findNode(items, 'child1')!.text).toBe('Updated')
  })

  it('存在しないIDでエラーを投げる', () => {
    const tree = makeTree()
    expect(() => updateNodeText(tree, 'nonexistent', 'text')).toThrow(
      'Node not found',
    )
  })

  it('元のツリーを変更しない', () => {
    const tree = makeTree()
    updateNodeText(tree, 'child1', 'Updated')
    expect(tree[0].children[0].text).toBe('Child1')
  })
})

describe('moveNode', () => {
  it('別の親にノードを移動する', () => {
    const tree = makeTree()
    const items = moveNode(tree, 'child2', 'child1')
    expect(findNode(items, 'root1')!.children).toHaveLength(1)
    expect(findNode(items, 'child1')!.children).toHaveLength(2)
    expect(findNode(items, 'child2')!.level).toBe(2)
  })

  it('ルートレベルに移動する', () => {
    const tree = makeTree()
    const items = moveNode(tree, 'child1', null)
    expect(findNode(items, 'root1')!.children).toHaveLength(1)
    expect(items).toHaveLength(3)
    expect(findNode(items, 'child1')!.level).toBe(0)
  })

  it('子孫のレベルも更新される', () => {
    const tree = makeTree()
    const items = moveNode(tree, 'child1', null)
    expect(findNode(items, 'grandchild1')!.level).toBe(1)
  })

  it('元のツリーを変更しない', () => {
    const tree = makeTree()
    moveNode(tree, 'child2', 'child1')
    expect(tree[0].children).toHaveLength(2)
  })
})

describe('filterRedundantNodes', () => {
  it('祖先が選択に含まれる場合は子孫を除外する', () => {
    const tree = makeTree()
    // root1とその子孫child1を選択
    const selected = ['root1', 'child1']
    const result = filterRedundantNodes(tree, selected)
    // root1のみが残る（child1はroot1の子孫なので除外）
    expect(result).toEqual(['root1'])
  })

  it('親子関係がない場合は全て残す', () => {
    const tree = makeTree()
    const selected = ['child1', 'child2']
    const result = filterRedundantNodes(tree, selected)
    expect(result).toEqual(['child1', 'child2'])
  })

  it('空配列は空配列を返す', () => {
    const tree = makeTree()
    const result = filterRedundantNodes(tree, [])
    expect(result).toEqual([])
  })

  it('深いネストの子孫も除外する', () => {
    const tree = makeTree()
    // child1とその子grandchild1を選択
    const selected = ['child1', 'grandchild1']
    const result = filterRedundantNodes(tree, selected)
    expect(result).toEqual(['child1'])
  })

  it('兄弟間の選択は全て残す', () => {
    const tree = makeTree()
    // root1とroot2を選択（兄弟関係）
    const selected = ['root1', 'root2']
    const result = filterRedundantNodes(tree, selected)
    expect(result).toEqual(['root1', 'root2'])
  })

  it('複数の祖先-子孫ペアを正しく処理する', () => {
    const tree = makeTree()
    // root1、child1、grandchild1を選択
    const selected = ['root1', 'child1', 'grandchild1']
    const result = filterRedundantNodes(tree, selected)
    // root1のみが残る
    expect(result).toEqual(['root1'])
  })
})

describe('deleteNodes', () => {
  it('複数ノードを一括削除する', () => {
    const tree = makeTree()
    const items = deleteNodes(tree, ['child1', 'child2'])
    expect(findNode(items, 'child1')).toBeNull()
    expect(findNode(items, 'child2')).toBeNull()
    expect(findNode(items, 'root1')!.children).toHaveLength(0)
  })

  it('祖先ノードが含まれる場合は冗長な子孫の削除を防ぐ', () => {
    const tree = makeTree()
    // root1とその子孫を全て選択
    const items = deleteNodes(tree, ['root1', 'child1', 'grandchild1'])
    expect(findNode(items, 'root1')).toBeNull()
    expect(items).toHaveLength(1) // root2のみ残る
    expect(items[0].id).toBe('root2')
  })

  it('空配列では何も削除しない', () => {
    const tree = makeTree()
    const items = deleteNodes(tree, [])
    expect(items).toEqual(tree)
  })

  it('元のツリーを変更しない', () => {
    const tree = makeTree()
    deleteNodes(tree, ['child1'])
    expect(tree[0].children).toHaveLength(2)
  })
})

describe('recalculateLineNumbers', () => {
  it('行番号を深さ優先で再計算する', () => {
    const tree = makeTree()
    const result = recalculateLineNumbers(tree)

    expect(result[0].lineNumber).toBe(1) // root1
    expect(result[0].children[0].lineNumber).toBe(2) // child1
    expect(result[0].children[0].children[0].lineNumber).toBe(3) // grandchild1
    expect(result[0].children[1].lineNumber).toBe(4) // child2
    expect(result[1].lineNumber).toBe(5) // root2
  })

  it('元のツリーを変更しない', () => {
    const tree = makeTree()
    recalculateLineNumbers(tree)
    expect(tree[0].lineNumber).toBe(1)
  })
})

describe('getAllNodeIds', () => {
  it('全ノードのIDを取得する', () => {
    const tree = makeTree()
    const ids = getAllNodeIds(tree)

    expect(ids).toHaveLength(5)
    expect(ids).toContain('root1')
    expect(ids).toContain('child1')
    expect(ids).toContain('grandchild1')
    expect(ids).toContain('child2')
    expect(ids).toContain('root2')
  })

  it('空配列は空配列を返す', () => {
    const ids = getAllNodeIds([])
    expect(ids).toEqual([])
  })
})

describe('countNodes', () => {
  it('全ノード数をカウントする', () => {
    const tree = makeTree()
    const count = countNodes(tree)
    expect(count).toBe(5)
  })

  it('空配列は0を返す', () => {
    const count = countNodes([])
    expect(count).toBe(0)
  })
})
