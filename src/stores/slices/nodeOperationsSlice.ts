import type { MindMapState } from '../mindMapStore';
import type { ListItem } from '../../types/markdown';
import type { MindMapMetadata } from '../../types/mindMap';
import { regenerateFromTree, type RegenerateResult } from '../helpers/regenerateFromTree';
import {
  addChildNode as treeAddChild,
  addSiblingNode as treeAddSibling,
  addSiblingNodeBefore as treeAddSiblingBefore,
  deleteNode as treeDelete,
  deleteNodes as treeDeleteNodes,
  updateNodeText as treeUpdateText,
} from '../../utils/treeOperations';

type SetState = (partial: Partial<MindMapState> | ((state: MindMapState) => Partial<MindMapState>)) => void;
type GetState = () => MindMapState;

export interface NodeOperationsSlice {
  setSelectedNodeId: (nodeId: string | null) => void;
  setSelectedNodeIds: (nodeIds: string[]) => void;
  setEditingNodeId: (nodeId: string | null) => void;
  addChildNode: (parentId: string, text?: string) => string | null;
  addSiblingNode: (siblingId: string, text?: string) => string | null;
  addSiblingNodeBefore: (siblingId: string, text?: string) => string | null;
  deleteNode: (nodeId: string) => void;
  deleteNodes: (nodeIds: string[]) => void;
  updateNodeText: (nodeId: string, text: string) => void;
}

/**
 * ツリー操作 → 再生成 → set → save の共通パターン
 */
function applyTreeOperation(
  set: SetState,
  get: GetState,
  operation: (items: ListItem[], metadata: MindMapMetadata) => {
    result: RegenerateResult;
    stateOverrides: Partial<MindMapState>;
  },
  errorMessage: string,
): boolean {
  const { parsed, metadata } = get();
  if (!parsed) return false;

  try {
    const { result, stateOverrides } = operation(parsed.items, metadata);
    set({ ...result, ...stateOverrides });
    get().saveToStorage();
    return true;
  } catch {
    console.error(errorMessage);
    return false;
  }
}

export function createNodeOperationsSlice(
  set: SetState,
  get: GetState
): NodeOperationsSlice {
  return {
    setSelectedNodeId: (nodeId: string | null) => {
      if (nodeId === null) {
        const { nodes } = get();
        set({
          selectedNodeId: null,
          selectedNodeIds: [],
          nodes: nodes.map(n => n.selected ? { ...n, selected: false } : n),
        });
      } else {
        set({ selectedNodeId: nodeId, selectedNodeIds: [nodeId] });
      }
    },

    setSelectedNodeIds: (nodeIds: string[]) => {
      set({
        selectedNodeIds: nodeIds,
        selectedNodeId: nodeIds.length === 1 ? nodeIds[0] : null,
      });
    },

    setEditingNodeId: (nodeId: string | null) => {
      set({ editingNodeId: nodeId });
    },

    addChildNode: (parentId: string, text = '新しいノード') => {
      let resultNodeId: string | null = null;
      const success = applyTreeOperation(set, get, (items, metadata) => {
        const { items: newItems, newNodeId } = treeAddChild(items, parentId, text);
        resultNodeId = newNodeId;
        return {
          result: regenerateFromTree(newItems, metadata, false),
          stateOverrides: {
            selectedNodeId: newNodeId,
            editingNodeId: newNodeId,
            centerTargetNodeId: newNodeId,
          },
        };
      }, 'Failed to add child node');
      return success ? resultNodeId : null;
    },

    addSiblingNode: (siblingId: string, text = '新しいノード') => {
      let resultNodeId: string | null = null;
      const success = applyTreeOperation(set, get, (items, metadata) => {
        const { items: newItems, newNodeId } = treeAddSibling(items, siblingId, text);
        resultNodeId = newNodeId;
        return {
          result: regenerateFromTree(newItems, metadata, false),
          stateOverrides: {
            selectedNodeId: newNodeId,
            editingNodeId: newNodeId,
            centerTargetNodeId: newNodeId,
          },
        };
      }, 'Failed to add sibling node');
      return success ? resultNodeId : null;
    },

    addSiblingNodeBefore: (siblingId: string, text = '新しいノード') => {
      let resultNodeId: string | null = null;
      const success = applyTreeOperation(set, get, (items, metadata) => {
        const { items: newItems, newNodeId } = treeAddSiblingBefore(items, siblingId, text);
        resultNodeId = newNodeId;
        return {
          result: regenerateFromTree(newItems, metadata, false),
          stateOverrides: {
            selectedNodeId: newNodeId,
            editingNodeId: newNodeId,
            centerTargetNodeId: newNodeId,
          },
        };
      }, 'Failed to add sibling node before');
      return success ? resultNodeId : null;
    },

    deleteNode: (nodeId: string) => {
      const { nodes } = get();
      const currentIndex = nodes.findIndex((n) => n.id === nodeId);
      let nextSelectedId: string | null = null;

      if (currentIndex > 0) {
        nextSelectedId = nodes[currentIndex - 1].id;
      } else if (nodes.length > 1) {
        nextSelectedId = nodes[1].id;
      }

      applyTreeOperation(set, get, (items, metadata) => {
        const newItems = treeDelete(items, nodeId);
        return {
          result: regenerateFromTree(newItems, metadata, true),
          stateOverrides: { selectedNodeId: nextSelectedId, editingNodeId: null },
        };
      }, 'Failed to delete node');
    },

    deleteNodes: (nodeIds: string[]) => {
      if (nodeIds.length === 0) return;

      applyTreeOperation(set, get, (items, metadata) => {
        const newItems = treeDeleteNodes(items, nodeIds);
        return {
          result: regenerateFromTree(newItems, metadata, true),
          stateOverrides: {
            selectedNodeId: null,
            selectedNodeIds: [],
            editingNodeId: null,
          },
        };
      }, 'Failed to delete nodes');
    },

    updateNodeText: (nodeId: string, text: string) => {
      applyTreeOperation(set, get, (items, metadata) => {
        const newItems = treeUpdateText(items, nodeId, text);
        return {
          result: regenerateFromTree(newItems, metadata, true),
          stateOverrides: { editingNodeId: null },
        };
      }, 'Failed to update node text');
    },
  };
}
