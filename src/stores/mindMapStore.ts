import { create } from 'zustand';
import type { XYPosition } from '@xyflow/react';
import type { MindMapNode, MindMapEdge, MindMapMetadata } from '../types/mindMap';
import type { ParsedMarkdown, ListItem } from '../types/markdown';
import { parseAndEnsureIds } from '../utils/markdownParser';
import { treeToFlow } from '../utils/treeToFlow';
import { calculateLayout } from '../utils/layoutEngine';
import { treeToMarkdown } from '../utils/treeToMarkdown';
import { storage } from '../utils/storage';
import {
  addChildNode as treeAddChild,
  addSiblingNode as treeAddSibling,
  deleteNode as treeDelete,
  updateNodeText as treeUpdateText,
} from '../utils/treeOperations';

interface MindMapState {
  markdown: string;
  metadata: MindMapMetadata;
  parsed: ParsedMarkdown | null;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  selectedNodeId: string | null;
  editingNodeId: string | null;

  setMarkdown: (markdown: string) => void;
  updateNodePosition: (nodeId: string, position: XYPosition) => void;
  toggleNodeExpanded: (nodeId: string) => void;
  recalculateLayout: () => void;
  loadFromStorage: () => void;
  saveToStorage: () => void;

  // 新しいアクション（双方向同期用）
  setSelectedNodeId: (nodeId: string | null) => void;
  setEditingNodeId: (nodeId: string | null) => void;
  addChildNode: (parentId: string, text?: string) => string | null;
  addSiblingNode: (siblingId: string, text?: string) => string | null;
  deleteNode: (nodeId: string) => void;
  updateNodeText: (nodeId: string, text: string) => void;
}

const INITIAL_METADATA: MindMapMetadata = {
  version: 1,
  nodeMetadata: {},
  viewport: { x: 0, y: 0, zoom: 1 },
  lastModified: Date.now(),
};

const SAMPLE_MARKDOWN = `- プロジェクト計画
  - フェーズ1
    - 要件定義
    - 設計
  - フェーズ2
    - 実装
    - テスト
- リソース
  - 人員
  - 予算`;

/**
 * ツリーからマークダウンとReact Flowデータを再生成するヘルパー
 */
function regenerateFromTree(
  items: ListItem[],
  metadata: MindMapMetadata,
  preservePositions: boolean = false
): {
  markdown: string;
  parsed: ParsedMarkdown;
  metadata: MindMapMetadata;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
} {
  const markdown = treeToMarkdown(items);
  const parsed: ParsedMarkdown = { items, rawText: markdown };

  const updatedNodeMetadata = preservePositions
    ? calculateLayout(items, metadata.nodeMetadata)
    : calculateLayout(items, {});

  const updatedMetadata: MindMapMetadata = {
    ...metadata,
    nodeMetadata: updatedNodeMetadata,
    lastModified: Date.now(),
  };

  const { nodes, edges } = treeToFlow(parsed, updatedMetadata);

  return { markdown, parsed, metadata: updatedMetadata, nodes, edges };
}

export const useMindMapStore = create<MindMapState>((set, get) => ({
  markdown: '',
  metadata: INITIAL_METADATA,
  parsed: null,
  nodes: [],
  edges: [],
  selectedNodeId: null,
  editingNodeId: null,

  setMarkdown: (markdown: string) => {
    const { parsed, markdownWithIds, hasChanges } = parseAndEnsureIds(markdown);
    const finalMarkdown = hasChanges ? markdownWithIds : markdown;
    const { metadata } = get();

    const updatedNodeMetadata = calculateLayout(
      parsed.items,
      metadata.nodeMetadata
    );

    const updatedMetadata: MindMapMetadata = {
      ...metadata,
      nodeMetadata: updatedNodeMetadata,
      lastModified: Date.now(),
    };

    const { nodes, edges } = treeToFlow(parsed, updatedMetadata);

    set({
      markdown: finalMarkdown,
      parsed,
      metadata: updatedMetadata,
      nodes,
      edges,
    });

    get().saveToStorage();
  },

  updateNodePosition: (nodeId: string, position: XYPosition) => {
    const { metadata, parsed } = get();
    if (!parsed) return;

    const updatedMetadata: MindMapMetadata = {
      ...metadata,
      nodeMetadata: {
        ...metadata.nodeMetadata,
        [nodeId]: {
          ...metadata.nodeMetadata[nodeId],
          id: nodeId,
          position,
          expanded: metadata.nodeMetadata[nodeId]?.expanded ?? true,
        },
      },
      lastModified: Date.now(),
    };

    const { nodes, edges } = treeToFlow(parsed, updatedMetadata);

    set({
      metadata: updatedMetadata,
      nodes,
      edges,
    });

    get().saveToStorage();
  },

  toggleNodeExpanded: (nodeId: string) => {
    const { metadata, parsed } = get();
    if (!parsed) return;

    const currentExpanded = metadata.nodeMetadata[nodeId]?.expanded ?? true;

    const updatedMetadata: MindMapMetadata = {
      ...metadata,
      nodeMetadata: {
        ...metadata.nodeMetadata,
        [nodeId]: {
          ...metadata.nodeMetadata[nodeId],
          id: nodeId,
          position: metadata.nodeMetadata[nodeId]?.position ?? { x: 0, y: 0 },
          expanded: !currentExpanded,
        },
      },
      lastModified: Date.now(),
    };

    const { nodes, edges } = treeToFlow(parsed, updatedMetadata);

    set({
      metadata: updatedMetadata,
      nodes,
      edges,
    });

    get().saveToStorage();
  },

  recalculateLayout: () => {
    const { parsed, metadata } = get();
    if (!parsed) return;

    const newNodeMetadata = calculateLayout(parsed.items, {});

    const updatedMetadata: MindMapMetadata = {
      ...metadata,
      nodeMetadata: newNodeMetadata,
      lastModified: Date.now(),
    };

    const { nodes, edges } = treeToFlow(parsed, updatedMetadata);

    set({
      metadata: updatedMetadata,
      nodes,
      edges,
    });

    get().saveToStorage();
  },

  loadFromStorage: () => {
    const data = storage.load();
    if (data) {
      const { parsed, markdownWithIds, hasChanges } = parseAndEnsureIds(data.markdown);
      const finalMarkdown = hasChanges ? markdownWithIds : data.markdown;
      const { nodes, edges } = treeToFlow(parsed, data.metadata);

      set({
        markdown: finalMarkdown,
        metadata: data.metadata,
        parsed,
        nodes,
        edges,
      });

      if (hasChanges) {
        get().saveToStorage();
      }
    } else {
      get().setMarkdown(SAMPLE_MARKDOWN);
    }
  },

  saveToStorage: () => {
    const { markdown, metadata } = get();
    storage.save({ markdown, metadata });
  },

  // 新しいアクション
  setSelectedNodeId: (nodeId: string | null) => {
    set({ selectedNodeId: nodeId });
  },

  setEditingNodeId: (nodeId: string | null) => {
    set({ editingNodeId: nodeId });
  },

  addChildNode: (parentId: string, text: string = '新しいノード') => {
    const { parsed, metadata } = get();
    if (!parsed) return null;

    try {
      const { items: newItems, newNodeId } = treeAddChild(
        parsed.items,
        parentId,
        text
      );

      const result = regenerateFromTree(newItems, metadata, true);

      set({
        ...result,
        selectedNodeId: newNodeId,
        editingNodeId: newNodeId,
      });

      get().saveToStorage();
      return newNodeId;
    } catch {
      console.error('Failed to add child node');
      return null;
    }
  },

  addSiblingNode: (siblingId: string, text: string = '新しいノード') => {
    const { parsed, metadata } = get();
    if (!parsed) return null;

    try {
      const { items: newItems, newNodeId } = treeAddSibling(
        parsed.items,
        siblingId,
        text
      );

      const result = regenerateFromTree(newItems, metadata, true);

      set({
        ...result,
        selectedNodeId: newNodeId,
        editingNodeId: newNodeId,
      });

      get().saveToStorage();
      return newNodeId;
    } catch {
      console.error('Failed to add sibling node');
      return null;
    }
  },

  deleteNode: (nodeId: string) => {
    const { parsed, metadata, nodes } = get();
    if (!parsed) return;

    // 削除後に選択するノードを決定（前の兄弟 or 親）
    const currentIndex = nodes.findIndex((n) => n.id === nodeId);
    let nextSelectedId: string | null = null;

    if (currentIndex > 0) {
      nextSelectedId = nodes[currentIndex - 1].id;
    } else if (nodes.length > 1) {
      nextSelectedId = nodes[1].id;
    }

    try {
      const newItems = treeDelete(parsed.items, nodeId);
      const result = regenerateFromTree(newItems, metadata, true);

      set({
        ...result,
        selectedNodeId: nextSelectedId,
        editingNodeId: null,
      });

      get().saveToStorage();
    } catch {
      console.error('Failed to delete node');
    }
  },

  updateNodeText: (nodeId: string, text: string) => {
    const { parsed, metadata } = get();
    if (!parsed) return;

    try {
      const newItems = treeUpdateText(parsed.items, nodeId, text);
      const result = regenerateFromTree(newItems, metadata, true);

      set({
        ...result,
        editingNodeId: null,
      });

      get().saveToStorage();
    } catch {
      console.error('Failed to update node text');
    }
  },
}));
