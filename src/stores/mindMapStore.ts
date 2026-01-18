import { create } from 'zustand';
import type { XYPosition } from '@xyflow/react';
import type { MindMapNode, MindMapEdge, MindMapMetadata, StoredData } from '../types/mindMap';
import type { ParsedMarkdown, ListItem } from '../types/markdown';
import { parseAndEnsureIds, syncMarkdownWithTree } from '../utils/markdownParser';
import { treeToFlow } from '../utils/treeToFlow';
import { calculateLayout } from '../utils/layoutEngine';
import { treeToMarkdown } from '../utils/treeToMarkdown';
import { fileStorage } from '../utils/storage';
import {
  addChildNode as treeAddChild,
  addSiblingNode as treeAddSibling,
  deleteNode as treeDelete,
  updateNodeText as treeUpdateText,
} from '../utils/treeOperations';

interface MindMapState {
  markdown: string;           // 内部用（IDコメントあり）
  displayMarkdown: string;    // 表示用（IDコメントなし）
  metadata: MindMapMetadata;
  parsed: ParsedMarkdown | null;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  selectedNodeId: string | null;
  editingNodeId: string | null;
  activeFileId: string | null; // 現在編集中のファイルID

  setMarkdown: (markdown: string) => void;
  updateNodePosition: (nodeId: string, position: XYPosition) => void;
  toggleNodeExpanded: (nodeId: string) => void;
  recalculateLayout: () => void;
  loadFromStorage: () => void;
  saveToStorage: () => void;

  // 複数ファイル対応
  loadFileData: (fileId: string) => void;
  getFileData: () => StoredData;
  saveActiveFile: () => void;
  resetToDefault: () => void;

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
  displayMarkdown: string;
  parsed: ParsedMarkdown;
  metadata: MindMapMetadata;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
} {
  const markdown = treeToMarkdown(items, { embedIds: true });
  const displayMarkdown = treeToMarkdown(items, { embedIds: false });
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

  return { markdown, displayMarkdown, parsed, metadata: updatedMetadata, nodes, edges };
}

export const useMindMapStore = create<MindMapState>((set, get) => ({
  markdown: '',
  displayMarkdown: '',
  metadata: INITIAL_METADATA,
  parsed: null,
  nodes: [],
  edges: [],
  selectedNodeId: null,
  editingNodeId: null,
  activeFileId: null,

  setMarkdown: (markdown: string) => {
    const { parsed: existingParsed, metadata } = get();

    // 入力にIDがあるか確認
    const hasIds = /<!--\s*id:[a-zA-Z0-9]+\s*-->/.test(markdown);

    let parsed: ParsedMarkdown;
    let finalMarkdown: string;

    if (hasIds) {
      // IDがある場合は通常のパース（parseAndEnsureIds）
      const result = parseAndEnsureIds(markdown);
      parsed = result.parsed;
      finalMarkdown = result.markdownWithIds;
    } else {
      // IDがない場合は既存ツリーとマッチングして同期
      const result = syncMarkdownWithTree(markdown, existingParsed?.items ?? null);
      parsed = result.parsed;
      finalMarkdown = result.markdownWithIds;
    }

    // 表示用マークダウンを生成（IDなし）
    const displayMarkdown = treeToMarkdown(parsed.items, { embedIds: false });

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
      displayMarkdown,
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
    // 後方互換性: 直接呼ばれた場合は何もしない（loadFileDataを使用）
  },

  saveToStorage: () => {
    // 後方互換性: saveActiveFileを呼び出す
    get().saveActiveFile();
  },

  loadFileData: (fileId: string) => {
    const data = fileStorage.loadFileData(fileId);
    if (data) {
      const { parsed, markdownWithIds, hasChanges } = parseAndEnsureIds(data.markdown);
      const finalMarkdown = hasChanges ? markdownWithIds : data.markdown;
      const displayMarkdown = treeToMarkdown(parsed.items, { embedIds: false });
      const { nodes, edges } = treeToFlow(parsed, data.metadata);

      set({
        markdown: finalMarkdown,
        displayMarkdown,
        metadata: data.metadata,
        parsed,
        nodes,
        edges,
        activeFileId: fileId,
        selectedNodeId: null,
        editingNodeId: null,
      });

      if (hasChanges) {
        get().saveActiveFile();
      }
    } else {
      // ファイルデータがない場合はデフォルト状態で初期化
      set({ activeFileId: fileId });
      get().resetToDefault();
    }
  },

  getFileData: () => {
    const { markdown, metadata } = get();
    return { markdown, metadata };
  },

  saveActiveFile: () => {
    const { activeFileId, markdown, metadata } = get();
    if (activeFileId) {
      fileStorage.saveFileData(activeFileId, { markdown, metadata });
    }
  },

  resetToDefault: () => {
    // 既存のparsedをクリアしてから新しいマークダウンを設定
    // これにより、syncMarkdownWithTreeが既存のIDを再利用しないようにする
    set({ parsed: null });
    get().setMarkdown(SAMPLE_MARKDOWN);
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
