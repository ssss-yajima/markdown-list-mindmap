import { describe, it, expect } from 'vitest'
import { treeToFlow } from '../treeToFlow'
import type { ParsedMarkdown } from '../../types/markdown'
import type { MindMapMetadata } from '../../types/mindMap'

function makeParsed(): ParsedMarkdown {
  return {
    items: [
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
            children: [
              {
                id: 'grandchild1',
                text: 'GrandChild1',
                level: 2,
                lineNumber: 4,
                listType: 'unordered',
                children: [],
              },
            ],
          },
        ],
      },
    ],
    rawText: '',
  }
}

function makeMetadata(
  overrides: Partial<Record<string, { position: { x: number; y: number }; expanded: boolean }>> = {},
): MindMapMetadata {
  return {
    version: 1,
    nodeMetadata: {
      root1: { id: 'root1', position: { x: 0, y: 0 }, expanded: true },
      child1: { id: 'child1', position: { x: 100, y: 0 }, expanded: true },
      child2: { id: 'child2', position: { x: 100, y: 50 }, expanded: true },
      grandchild1: { id: 'grandchild1', position: { x: 200, y: 50 }, expanded: true },
      ...overrides,
    },
    viewport: { x: 0, y: 0, zoom: 1 },
    lastModified: Date.now(),
  }
}

describe('treeToFlow', () => {
  it('ノードを正しく生成する', () => {
    const parsed = makeParsed()
    const metadata = makeMetadata()
    const { nodes } = treeToFlow(parsed, metadata)

    expect(nodes).toHaveLength(4)

    const root = nodes.find((n) => n.id === 'root1')
    expect(root).toBeDefined()
    expect(root!.data.label).toBe('Root')
    expect(root!.data.level).toBe(0)
    expect(root!.data.hasChildren).toBe(true)
    expect(root!.data.expanded).toBe(true)
    expect(root!.type).toBe('mindmap')
  })

  it('ノードのposition属性を反映する', () => {
    const parsed = makeParsed()
    const metadata = makeMetadata()
    const { nodes } = treeToFlow(parsed, metadata)

    const child1 = nodes.find((n) => n.id === 'child1')
    expect(child1!.position).toEqual({ x: 100, y: 0 })
  })

  it('エッジを正しく生成する', () => {
    const parsed = makeParsed()
    const metadata = makeMetadata()
    const { edges } = treeToFlow(parsed, metadata)

    expect(edges).toHaveLength(3)

    const rootToChild1 = edges.find((e) => e.source === 'root1' && e.target === 'child1')
    expect(rootToChild1).toBeDefined()
    expect(rootToChild1!.id).toBe('edge-root1-child1')

    const rootToChild2 = edges.find((e) => e.source === 'root1' && e.target === 'child2')
    expect(rootToChild2).toBeDefined()

    const child2ToGrandchild = edges.find((e) => e.source === 'child2' && e.target === 'grandchild1')
    expect(child2ToGrandchild).toBeDefined()
  })

  it('ルートノードにはエッジのsourceが存在しない', () => {
    const parsed = makeParsed()
    const metadata = makeMetadata()
    const { edges } = treeToFlow(parsed, metadata)

    const rootAsTarget = edges.find((e) => e.target === 'root1')
    expect(rootAsTarget).toBeUndefined()
  })

  it('折りたたまれたノードの子はノード/エッジに含まれない', () => {
    const parsed = makeParsed()
    const metadata = makeMetadata({
      child2: { id: 'child2', position: { x: 100, y: 50 }, expanded: false },
    } as Record<string, { id: string; position: { x: number; y: number }; expanded: boolean }>)
    const { nodes, edges } = treeToFlow(parsed, metadata)

    expect(nodes.find((n) => n.id === 'grandchild1')).toBeUndefined()
    expect(edges.find((e) => e.target === 'grandchild1')).toBeUndefined()
    expect(nodes).toHaveLength(3)
    expect(edges).toHaveLength(2)
  })

  it('metadataにないノードはデフォルト値を使用する', () => {
    const parsed = makeParsed()
    const metadata: MindMapMetadata = {
      version: 1,
      nodeMetadata: {},
      viewport: { x: 0, y: 0, zoom: 1 },
      lastModified: Date.now(),
    }
    const { nodes } = treeToFlow(parsed, metadata)

    expect(nodes).toHaveLength(4)
    const root = nodes.find((n) => n.id === 'root1')
    expect(root!.position).toEqual({ x: 0, y: 0 })
    expect(root!.data.expanded).toBe(true)
  })

  it('空のパース結果は空配列を返す', () => {
    const parsed: ParsedMarkdown = { items: [], rawText: '' }
    const metadata = makeMetadata()
    const { nodes, edges } = treeToFlow(parsed, metadata)

    expect(nodes).toHaveLength(0)
    expect(edges).toHaveLength(0)
  })

  it('hasChildrenフラグが正しく設定される', () => {
    const parsed = makeParsed()
    const metadata = makeMetadata()
    const { nodes } = treeToFlow(parsed, metadata)

    expect(nodes.find((n) => n.id === 'root1')!.data.hasChildren).toBe(true)
    expect(nodes.find((n) => n.id === 'child1')!.data.hasChildren).toBe(false)
    expect(nodes.find((n) => n.id === 'child2')!.data.hasChildren).toBe(true)
    expect(nodes.find((n) => n.id === 'grandchild1')!.data.hasChildren).toBe(false)
  })
})
