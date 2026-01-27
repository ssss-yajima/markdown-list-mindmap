import { describe, it, expect } from 'vitest'
import {
  findNode,
  findParent,
  findSiblings,
  addChildNode,
  addSiblingNode,
  addSiblingNodeBefore,
  deleteNode,
  updateNodeText,
  moveNode,
  cloneTree,
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
    expect(() => addChildNode(tree, 'nonexistent')).toThrow('Parent node not found')
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
    expect(() => addSiblingNode(tree, 'nonexistent')).toThrow('Sibling node not found')
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
    expect(() => updateNodeText(tree, 'nonexistent', 'text')).toThrow('Node not found')
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
