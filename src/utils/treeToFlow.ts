import type { ListItem, ParsedMarkdown } from '../types/markdown'
import type {
  MindMapNode,
  MindMapEdge,
  MindMapMetadata,
  LayoutDirection,
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

  function traverse(
    item: ListItem,
    parentId: string | null,
    inheritedDirection: LayoutDirection,
  ): void {
    const nodeMeta = metadata.nodeMetadata[item.id]
    const isExpanded = nodeMeta?.expanded ?? true

    // 方向の決定: レベル1ノードはmetadataから、それ以外は親から継承
    const direction =
      item.level === 1
        ? (nodeMeta?.direction ?? inheritedDirection)
        : inheritedDirection

    const node: MindMapNode = {
      id: item.id,
      type: 'mindmap',
      position: nodeMeta?.position ?? { x: 0, y: 0 },
      data: {
        label: item.text,
        level: item.level,
        hasChildren: item.children.length > 0,
        expanded: isExpanded,
        direction: item.level > 0 ? direction : undefined,
      },
    }
    nodes.push(node)

    if (parentId) {
      // エッジのハンドル位置を方向に応じて設定
      const sourceHandle = direction === 'right' ? 'right' : 'left'
      const targetHandle = direction === 'right' ? 'left' : 'right'

      edges.push({
        id: `edge-${parentId}-${item.id}`,
        source: parentId,
        target: item.id,
        type: 'bezier',
        sourceHandle,
        targetHandle,
      })
    }

    if (isExpanded) {
      for (const child of item.children) {
        traverse(child, item.id, direction)
      }
    }
  }

  for (const item of parsed.items) {
    traverse(item, null, 'right')
  }

  return { nodes, edges }
}
