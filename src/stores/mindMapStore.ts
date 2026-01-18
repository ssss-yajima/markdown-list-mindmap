import { create } from 'zustand';
import type { XYPosition } from '@xyflow/react';
import type { MindMapNode, MindMapEdge, MindMapMetadata } from '../types/mindMap';
import type { ParsedMarkdown } from '../types/markdown';
import { parseMarkdown } from '../utils/markdownParser';
import { treeToFlow } from '../utils/treeToFlow';
import { calculateLayout } from '../utils/layoutEngine';
import { storage } from '../utils/storage';

interface MindMapState {
  markdown: string;
  metadata: MindMapMetadata;
  parsed: ParsedMarkdown | null;
  nodes: MindMapNode[];
  edges: MindMapEdge[];

  setMarkdown: (markdown: string) => void;
  updateNodePosition: (nodeId: string, position: XYPosition) => void;
  toggleNodeExpanded: (nodeId: string) => void;
  recalculateLayout: () => void;
  loadFromStorage: () => void;
  saveToStorage: () => void;
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

export const useMindMapStore = create<MindMapState>((set, get) => ({
  markdown: '',
  metadata: INITIAL_METADATA,
  parsed: null,
  nodes: [],
  edges: [],

  setMarkdown: (markdown: string) => {
    const parsed = parseMarkdown(markdown);
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
      markdown,
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
      const parsed = parseMarkdown(data.markdown);
      const { nodes, edges } = treeToFlow(parsed, data.metadata);

      set({
        markdown: data.markdown,
        metadata: data.metadata,
        parsed,
        nodes,
        edges,
      });
    } else {
      // 初回はサンプルデータをセット
      get().setMarkdown(SAMPLE_MARKDOWN);
    }
  },

  saveToStorage: () => {
    const { markdown, metadata } = get();
    storage.save({ markdown, metadata });
  },
}));
