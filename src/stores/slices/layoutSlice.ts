import type { XYPosition } from '@xyflow/react';
import type { MindMapState } from '../mindMapStore';
import type { MindMapMetadata, LayoutDirection } from '../../types/mindMap';
import type { ListItem } from '../../types/markdown';
import { treeToFlow } from '../../utils/treeToFlow';
import { calculateLayout, resolveOverlaps, buildContentMapFromItems, relayoutSubtree } from '../../utils/layoutEngine';

/**
 * itemsからnodeIdを持つListItemを探す
 */
function findItem(items: ListItem[], nodeId: string): ListItem | null {
  for (const item of items) {
    if (item.id === nodeId) return item;
    const found = findItem(item.children, nodeId);
    if (found) return found;
  }
  return null;
}

/**
 * itemsからnodeIdの親（ルート）を探す
 */
function findParentRoot(items: ListItem[], nodeId: string): ListItem | null {
  for (const root of items) {
    if (root.id === nodeId) return null; // ルート自体の場合は親なし
    const found = findItem(root.children, nodeId);
    if (found) return root;
  }
  return null;
}

type SetState = (partial: Partial<MindMapState> | ((state: MindMapState) => Partial<MindMapState>)) => void;
type GetState = () => MindMapState;

export interface LayoutSlice {
  updateNodePosition: (nodeId: string, position: XYPosition) => void;
  updateNodePositions: (updates: { id: string; position: XYPosition }[]) => void;
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

      const contentMap = buildContentMapFromItems(parsed.items);

      // ドラッグされたノードのレベルを判定
      const draggedItem = findItem(parsed.items, nodeId);
      if (!draggedItem) return;

      let updatedNodeMetadata: Record<string, typeof metadata.nodeMetadata[string]>;

      // レベル1ノードの場合、方向判定と再レイアウト
      if (draggedItem.level === 1) {
        // 親（ルート）のX座標を取得
        const parentRoot = findParentRoot(parsed.items, nodeId);
        if (parentRoot) {
          const rootX = metadata.nodeMetadata[parentRoot.id]?.position?.x ?? 0;

          // ドラッグ位置に応じて方向を判定
          const newDirection: LayoutDirection = position.x < rootX ? 'left' : 'right';
          const currentDirection = metadata.nodeMetadata[nodeId]?.direction ?? 'right';

          // 方向が変わった場合、サブツリーを再レイアウト
          if (newDirection !== currentDirection) {
            updatedNodeMetadata = relayoutSubtree(
              nodeId,
              newDirection,
              parsed.items,
              {
                ...metadata.nodeMetadata,
                [nodeId]: {
                  ...metadata.nodeMetadata[nodeId],
                  id: nodeId,
                  position,
                  expanded: metadata.nodeMetadata[nodeId]?.expanded ?? true,
                  direction: newDirection,
                },
              }
            );
          } else {
            // 方向が変わらない場合は通常の位置更新
            updatedNodeMetadata = resolveOverlaps({
              ...metadata.nodeMetadata,
              [nodeId]: {
                ...metadata.nodeMetadata[nodeId],
                id: nodeId,
                position,
                expanded: metadata.nodeMetadata[nodeId]?.expanded ?? true,
                direction: currentDirection,
              },
            }, contentMap);
          }
        } else {
          // 親がない場合（ルート自体）は通常の位置更新
          updatedNodeMetadata = resolveOverlaps({
            ...metadata.nodeMetadata,
            [nodeId]: {
              ...metadata.nodeMetadata[nodeId],
              id: nodeId,
              position,
              expanded: metadata.nodeMetadata[nodeId]?.expanded ?? true,
            },
          }, contentMap);
        }
      } else {
        // レベル1以外のノードは通常の位置更新
        updatedNodeMetadata = resolveOverlaps({
          ...metadata.nodeMetadata,
          [nodeId]: {
            ...metadata.nodeMetadata[nodeId],
            id: nodeId,
            position,
            expanded: metadata.nodeMetadata[nodeId]?.expanded ?? true,
          },
        }, contentMap);
      }

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

    updateNodePositions: (updates: { id: string; position: XYPosition }[]) => {
      const { metadata, parsed } = get();
      if (!parsed || updates.length === 0) return;

      const contentMap = buildContentMapFromItems(parsed.items);

      let updatedNodeMetadata = { ...metadata.nodeMetadata };
      for (const { id, position } of updates) {
        const item = findItem(parsed.items, id);
        if (item && item.level === 1) {
          const parentRoot = findParentRoot(parsed.items, id);
          if (parentRoot) {
            const rootX = updatedNodeMetadata[parentRoot.id]?.position?.x ?? 0;
            const newDirection: LayoutDirection = position.x < rootX ? 'left' : 'right';
            const currentDirection = updatedNodeMetadata[id]?.direction ?? 'right';

            updatedNodeMetadata[id] = {
              ...updatedNodeMetadata[id],
              id,
              position,
              expanded: updatedNodeMetadata[id]?.expanded ?? true,
              direction: newDirection,
            };

            if (newDirection !== currentDirection) {
              updatedNodeMetadata = relayoutSubtree(
                id,
                newDirection,
                parsed.items,
                updatedNodeMetadata,
              );
            }
          } else {
            updatedNodeMetadata[id] = {
              ...updatedNodeMetadata[id],
              id,
              position,
              expanded: updatedNodeMetadata[id]?.expanded ?? true,
            };
          }
        } else {
          updatedNodeMetadata[id] = {
            ...updatedNodeMetadata[id],
            id,
            position,
            expanded: updatedNodeMetadata[id]?.expanded ?? true,
          };
        }
      }

      updatedNodeMetadata = resolveOverlaps(updatedNodeMetadata, contentMap);

      const updatedMetadata: MindMapMetadata = {
        ...metadata,
        nodeMetadata: updatedNodeMetadata,
        lastModified: Date.now(),
      };

      const { nodes, edges } = treeToFlow(parsed, updatedMetadata);

      // 移動対象ノードの選択状態を維持
      const movedIds = new Set(updates.map(u => u.id));
      const nodesWithSelection = nodes.map(n =>
        movedIds.has(n.id) ? { ...n, selected: true } : n
      );

      set({
        metadata: updatedMetadata,
        nodes: nodesWithSelection,
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

      // 既存のdirection情報を保持
      const directionOverrides: Record<string, LayoutDirection> = {};
      for (const [id, meta] of Object.entries(metadata.nodeMetadata)) {
        if (meta.direction) {
          directionOverrides[id] = meta.direction;
        }
      }

      const newNodeMetadata = calculateLayout(parsed.items, {}, undefined, directionOverrides);

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
