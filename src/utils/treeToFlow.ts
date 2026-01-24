import type { ListItem, ParsedMarkdown } from '../types/markdown'
import type {
  MindMapNode,
  MindMapEdge,
  MindMapMetadata,
} from '../types/mindMap'

interface ConversionResult {
  nodes: MindMapNode[]
  edges: MindMapEdge[]
}

export function treeToFlow(
  parsed: ParsedMarkdown,
  metadata: MindMapMetadata,
): ConversionResult {
  const nodes: MindMapNode[] = []
  const edges: MindMapEdge[] = []

  function traverse(item: ListItem, parentId: string | null): void {
    const nodeMeta = metadata.nodeMetadata[item.id]
    const isExpanded = nodeMeta?.expanded ?? true

    const node: MindMapNode = {
      id: item.id,
      type: 'mindmap',
      position: nodeMeta?.position ?? { x: 0, y: 0 },
      data: {
        label: item.text,
        level: item.level,
        hasChildren: item.children.length > 0,
        expanded: isExpanded,
        lineNumber: item.lineNumber,
      },
    }
    nodes.push(node)

    if (parentId) {
      edges.push({
        id: `edge-${parentId}-${item.id}`,
        source: parentId,
        target: item.id,
        type: 'bezier',
      })
    }

    if (isExpanded) {
      item.children.forEach((child) => traverse(child, item.id))
    }
  }

  parsed.items.forEach((item) => traverse(item, null))

  return { nodes, edges }
}
