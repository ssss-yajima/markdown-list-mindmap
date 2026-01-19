import type { MindMapNode, MindMapEdge, MindMapMetadata } from '../../types/mindMap';
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
  preservePositions: boolean = false
): RegenerateResult {
  const markdown = treeToMarkdown(items, { embedIds: true });
  const displayMarkdown = treeToMarkdown(items, { embedIds: false });
  const parsed: ParsedMarkdown = { items, rawText: markdown };

  const contentMap = buildContentMapFromItems(items);
  const updatedNodeMetadata = preservePositions
    ? resolveOverlaps(calculateLayout(items, metadata.nodeMetadata), contentMap)
    : calculateLayout(items, {});

  const updatedMetadata: MindMapMetadata = {
    ...metadata,
    nodeMetadata: updatedNodeMetadata,
    lastModified: Date.now(),
  };

  const { nodes, edges } = treeToFlow(parsed, updatedMetadata);

  return { markdown, displayMarkdown, parsed, metadata: updatedMetadata, nodes, edges };
}
