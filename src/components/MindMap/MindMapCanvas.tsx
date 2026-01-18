import { useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  type Node,
  type NodeTypes,
  type OnNodesChange,
  type OnSelectionChangeFunc,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { MindMapNode } from './MindMapNode';
import { useMindMapStore } from '../../stores/mindMapStore';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import type { MindMapNodeData } from '../../types/mindMap';
import './MindMapCanvas.css';

const nodeTypes: NodeTypes = {
  mindmap: MindMapNode,
};

export function MindMapCanvas() {
  const {
    nodes,
    edges,
    updateNodePosition,
    toggleNodeExpanded,
    recalculateLayout,
    setSelectedNodeId,
    setEditingNodeId,
  } = useMindMapStore();

  // キーボードショートカットを有効化
  useKeyboardShortcuts();

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      changes.forEach((change) => {
        if (change.type === 'position' && change.position && !change.dragging) {
          updateNodePosition(change.id, change.position);
        }
      });
    },
    [updateNodePosition]
  );

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      updateNodePosition(node.id, node.position);
    },
    [updateNodePosition]
  );

  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const data = node.data as MindMapNodeData;
      if (data.hasChildren) {
        toggleNodeExpanded(node.id);
      }
    },
    [toggleNodeExpanded]
  );

  const onSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes }) => {
      if (selectedNodes.length === 1) {
        setSelectedNodeId(selectedNodes[0].id);
      } else if (selectedNodes.length === 0) {
        setSelectedNodeId(null);
        setEditingNodeId(null);
      }
    },
    [setSelectedNodeId, setEditingNodeId]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setEditingNodeId(null);
  }, [setSelectedNodeId, setEditingNodeId]);

  return (
    <div className="mindmap-canvas">
      <div className="canvas-toolbar">
        <button onClick={recalculateLayout} className="toolbar-button">
          レイアウト再計算
        </button>
        <div className="toolbar-hint">
          Tab: 子追加 | Enter: 兄弟追加 | Cmd+Del: 削除 | F2: 編集
        </div>
      </div>
      <ReactFlow
        nodes={nodes as Node[]}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        onNodeDoubleClick={onNodeDoubleClick}
        onSelectionChange={onSelectionChange}
        onPaneClick={onPaneClick}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'bezier',
        }}
        selectNodesOnDrag={false}
      >
        <Controls />
        <MiniMap />
        <Background />
      </ReactFlow>
    </div>
  );
}
