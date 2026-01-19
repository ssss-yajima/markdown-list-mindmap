import type { XYPosition } from '@xyflow/react';
import type { MindMapState } from '../mindMapStore';
import type { MindMapMetadata } from '../../types/mindMap';
import { treeToFlow } from '../../utils/treeToFlow';
import { calculateLayout, resolveOverlaps, buildContentMapFromItems } from '../../utils/layoutEngine';

type SetState = (partial: Partial<MindMapState> | ((state: MindMapState) => Partial<MindMapState>)) => void;
type GetState = () => MindMapState;

export interface LayoutSlice {
  updateNodePosition: (nodeId: string, position: XYPosition) => void;
  toggleNodeExpanded: (nodeId: string) => void;
  recalculateLayout: () => void;
}

export function createLayoutSlice(
  set: SetState,
  get: GetState
): LayoutSlice {
  return {
    updateNodePosition: (nodeId: string, position: XYPosition) => {
      const { metadata, parsed } = get();
      if (!parsed) return;

      // 位置更新後に衝突解消を実行
      const contentMap = buildContentMapFromItems(parsed.items);
      const updatedNodeMetadata = resolveOverlaps({
        ...metadata.nodeMetadata,
        [nodeId]: {
          ...metadata.nodeMetadata[nodeId],
          id: nodeId,
          position,
          expanded: metadata.nodeMetadata[nodeId]?.expanded ?? true,
        },
      }, contentMap);

      const updatedMetadata: MindMapMetadata = {
        ...metadata,
        nodeMetadata: updatedNodeMetadata,
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
  };
}
