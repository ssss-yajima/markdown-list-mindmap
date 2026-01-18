import { useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  type Node,
  type NodeTypes,
  type OnNodesChange,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { MindMapNode } from './MindMapNode';
import { useMindMapStore } from '../../stores/mindMapStore';
import type { MindMapNodeData } from '../../types/mindMap';
import './MindMapCanvas.css';

const nodeTypes: NodeTypes = {
  mindmap: MindMapNode,
};

export function MindMapCanvas() {
  const { nodes, edges, updateNodePosition, toggleNodeExpanded, recalculateLayout } =
    useMindMapStore();

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

  const onNodeDoubleClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const data = node.data as MindMapNodeData;
      if (data.hasChildren) {
        toggleNodeExpanded(node.id);
      }
    },
    [toggleNodeExpanded]
  );

  return (
    <div className="mindmap-canvas">
      <div className="canvas-toolbar">
        <button onClick={recalculateLayout} className="toolbar-button">
          レイアウト再計算
        </button>
      </div>
      <ReactFlow
        nodes={nodes as Node[]}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        onNodeDoubleClick={onNodeDoubleClick}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
      >
        <Controls />
        <MiniMap />
        <Background />
      </ReactFlow>
    </div>
  );
}
