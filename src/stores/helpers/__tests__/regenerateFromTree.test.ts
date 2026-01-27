import { describe, it, expect } from 'vitest'
import { regenerateFromTree } from '../regenerateFromTree'
import type { ListItem } from '../../../types/markdown'
import type { MindMapMetadata } from '../../../types/mindMap'

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

function makeMetadata(): MindMapMetadata {
  return {
    version: 1,
    nodeMetadata: {
      root1: { id: 'root1', position: { x: 0, y: 0 }, expanded: true },
      child1: { id: 'child1', position: { x: 330, y: -20 }, expanded: true },
      child2: { id: 'child2', position: { x: 330, y: 60 }, expanded: true },
    },
    viewport: { x: 0, y: 0, zoom: 1 },
    lastModified: 1000,
  }
}

describe('regenerateFromTree', () => {
  it('markdown, displayMarkdown, nodes, edges を正しく生成する', () => {
    const items = makeItems()
    const metadata = makeMetadata()
    const result = regenerateFromTree(items, metadata)

    // markdown にはIDが埋め込まれている
    expect(result.markdown).toContain('<!-- id:root1 -->')
    expect(result.markdown).toContain('<!-- id:child1 -->')

    // displayMarkdown にはIDがない
    expect(result.displayMarkdown).not.toContain('<!-- id:')
    expect(result.displayMarkdown).toContain('Root')
    expect(result.displayMarkdown).toContain('Child1')

    // nodes が正しく生成される
    expect(result.nodes).toHaveLength(3)
    expect(result.nodes.find((n) => n.id === 'root1')).toBeDefined()
    expect(result.nodes.find((n) => n.id === 'child1')).toBeDefined()
    expect(result.nodes.find((n) => n.id === 'child2')).toBeDefined()

    // edges が正しく生成される
    expect(result.edges).toHaveLength(2)

    // parsed が正しい
    expect(result.parsed.items).toHaveLength(1)
    expect(result.parsed.items[0].children).toHaveLength(2)
  })

  it('preservePositions=false でレイアウトを再計算する', () => {
    const items = makeItems()
    const metadata = makeMetadata()
    const result = regenerateFromTree(items, metadata, false)

    // 新しいレイアウトが計算される
    expect(result.metadata.nodeMetadata.root1).toBeDefined()
    expect(result.metadata.nodeMetadata.child1).toBeDefined()
    expect(result.metadata.lastModified).toBeGreaterThan(0)
  })

  it('preservePositions=true で既存位置を保持する', () => {
    const items = makeItems()
    const metadata = makeMetadata()
    const result = regenerateFromTree(items, metadata, true)

    // 既存の位置が保持される
    expect(result.metadata.nodeMetadata.root1.position.x).toBe(0)
    expect(result.metadata.nodeMetadata.root1.position.y).toBe(0)
    expect(result.metadata.nodeMetadata.child1.position.x).toBe(330)
  })

  it('lastModified が更新される', () => {
    const items = makeItems()
    const metadata = makeMetadata()
    const result = regenerateFromTree(items, metadata)
    expect(result.metadata.lastModified).toBeGreaterThan(metadata.lastModified)
  })
})
