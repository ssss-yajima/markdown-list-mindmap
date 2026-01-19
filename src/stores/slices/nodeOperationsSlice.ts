import type { MindMapState } from '../mindMapStore';
import { regenerateFromTree } from '../helpers/regenerateFromTree';
import {
  addChildNode as treeAddChild,
  addSiblingNode as treeAddSibling,
  addSiblingNodeBefore as treeAddSiblingBefore,
  deleteNode as treeDelete,
  updateNodeText as treeUpdateText,
} from '../../utils/treeOperations';

type SetState = (partial: Partial<MindMapState> | ((state: MindMapState) => Partial<MindMapState>)) => void;
type GetState = () => MindMapState;

export interface NodeOperationsSlice {
  setSelectedNodeId: (nodeId: string | null) => void;
  setEditingNodeId: (nodeId: string | null) => void;
  addChildNode: (parentId: string, text?: string) => string | null;
  addSiblingNode: (siblingId: string, text?: string) => string | null;
  addSiblingNodeBefore: (siblingId: string, text?: string) => string | null;
  deleteNode: (nodeId: string) => void;
  updateNodeText: (nodeId: string, text: string) => void;
}

export function createNodeOperationsSlice(
  set: SetState,
  get: GetState
): NodeOperationsSlice {
  return {
    setSelectedNodeId: (nodeId: string | null) => {
      set({ selectedNodeId: nodeId });
    },

    setEditingNodeId: (nodeId: string | null) => {
      set({ editingNodeId: nodeId });
    },

    addChildNode: (parentId: string, text = '新しいノード') => {
      const { parsed, metadata } = get();
      if (!parsed) return null;

      try {
        const { items: newItems, newNodeId } = treeAddChild(
          parsed.items,
          parentId,
          text
        );

        const result = regenerateFromTree(newItems, metadata, false);

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

    addSiblingNode: (siblingId: string, text = '新しいノード') => {
      const { parsed, metadata } = get();
      if (!parsed) return null;

      try {
        const { items: newItems, newNodeId } = treeAddSibling(
          parsed.items,
          siblingId,
          text
        );

        const result = regenerateFromTree(newItems, metadata, false);

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

    addSiblingNodeBefore: (siblingId: string, text = '新しいノード') => {
      const { parsed, metadata } = get();
      if (!parsed) return null;

      try {
        const { items: newItems, newNodeId } = treeAddSiblingBefore(
          parsed.items,
          siblingId,
          text
        );

        const result = regenerateFromTree(newItems, metadata, false);

        set({
          ...result,
          selectedNodeId: newNodeId,
          editingNodeId: newNodeId,
        });

        get().saveToStorage();
        return newNodeId;
      } catch {
        console.error('Failed to add sibling node before');
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
  };
}
