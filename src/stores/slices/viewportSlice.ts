import type { MindMapState } from '../mindMapStore';

type SetState = (partial: Partial<MindMapState> | ((state: MindMapState) => Partial<MindMapState>)) => void;

export interface ViewportSlice {
  centerTargetNodeId: string | null;
  setCenterTargetNodeId: (nodeId: string | null) => void;
}

export function createViewportSlice(
  set: SetState,
): ViewportSlice {
  return {
    centerTargetNodeId: null,

    setCenterTargetNodeId: (nodeId: string | null) => {
      set({ centerTargetNodeId: nodeId });
    },
  };
}
