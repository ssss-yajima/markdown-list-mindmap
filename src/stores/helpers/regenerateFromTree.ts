import type { MindMapNode, MindMapEdge, MindMapMetadata, LayoutDirection } from '../../types/mindMap';
import type { ParsedMarkdown, ListItem } from '../../types/markdown';
import { treeToFlow } from '../../utils/treeToFlow';
import { calculateLayout, resolveOverlaps, buildContentMapFromItems } from '../../utils/layoutEngine';
import { treeToMarkdown } from '../../utils/treeToMarkdown';

export interface RegenerateResult {
  markdown: string;
  displayMarkdown: string;
  parsed: ParsedMarkdown;
  metadata: MindMapMetadata;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

/**
 * ツリーからマークダウンとReact Flowデータを再生成するヘルパー
 */
export function regenerateFromTree(
  items: ListItem[],
  metadata: MindMapMetadata,
  preservePositions = false
): RegenerateResult {
  const markdown = treeToMarkdown(items, { embedIds: true });
  const displayMarkdown = treeToMarkdown(items, { embedIds: false });
  const parsed: ParsedMarkdown = { items, rawText: markdown };

  const contentMap = buildContentMapFromItems(items);

  // 既存のdirection情報を保持
  const directionOverrides: Record<string, LayoutDirection> = {};
  for (const [id, meta] of Object.entries(metadata.nodeMetadata)) {
    if (meta.direction) {
      directionOverrides[id] = meta.direction;
    }
  }

  const updatedNodeMetadata = preservePositions
    ? resolveOverlaps(calculateLayout(items, metadata.nodeMetadata, undefined, directionOverrides), contentMap)
    : calculateLayout(items, {}, undefined, directionOverrides);

  const updatedMetadata: MindMapMetadata = {
    ...metadata,
    nodeMetadata: updatedNodeMetadata,
    lastModified: Date.now(),
  };

  const { nodes, edges } = treeToFlow(parsed, updatedMetadata);

  return { markdown, displayMarkdown, parsed, metadata: updatedMetadata, nodes, edges };
}
