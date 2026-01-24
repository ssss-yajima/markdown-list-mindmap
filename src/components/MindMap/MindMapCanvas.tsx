import { useCallback } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  SelectionMode,
  type Node,
  type NodeTypes,
  type OnNodesChange,
  type OnSelectionChangeFunc,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { MindMapNode } from './MindMapNode'
import { useMindMapStore } from '../../stores/mindMapStore'
import { useConfigStore } from '../../stores/configStore'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { CanvasSettingsProvider } from '../../contexts/CanvasSettingsContext'
import type { MindMapNodeData } from '../../types/mindMap'
import './MindMapCanvas.css'

const nodeTypes: NodeTypes = {
  mindmap: MindMapNode,
}

export function MindMapCanvas() {
  const {
    nodes,
    edges,
    updateNodePosition,
    updateNodePositions,
    toggleNodeExpanded,
    recalculateLayout,
    setSelectedNodeId,
    setSelectedNodeIds,
    setEditingNodeId,
  } = useMindMapStore()

  const { backgroundStyle } = useConfigStore()

  // キーボードショートカットを有効化
  useKeyboardShortcuts()

  const onNodesChange: OnNodesChange = useCallback(() => {
    // ノード位置の保存はonNodeDragStopで処理
  }, [])

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node, draggedNodes: Node[]) => {
      if (draggedNodes.length > 1) {
        const updates = draggedNodes.map((n) => ({
          id: n.id,
          position: n.position,
        }))
        updateNodePositions(updates)
      } else {
        updateNodePosition(node.id, node.position)
      }
    },
    [updateNodePosition, updateNodePositions],
  )

  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const data = node.data as MindMapNodeData
      if (data.hasChildren) {
        toggleNodeExpanded(node.id)
      }
    },
    [toggleNodeExpanded],
  )

  const onSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes }) => {
      if (selectedNodes.length === 1) {
        setSelectedNodeId(selectedNodes[0].id)
      } else if (selectedNodes.length > 1) {
        setSelectedNodeIds(selectedNodes.map((n) => n.id))
      } else {
        setSelectedNodeId(null)
      }
    },
    [setSelectedNodeId, setSelectedNodeIds],
  )

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
    setEditingNodeId(null)
  }, [setSelectedNodeId, setEditingNodeId])

  const renderBackground = () => {
    switch (backgroundStyle) {
      case 'none':
        return null
      case 'grid':
        return (
          <Background
            variant={BackgroundVariant.Lines}
            gap={24}
            color="rgba(200, 200, 200, 0.3)"
            lineWidth={1}
          />
        )
      case 'ruled':
        return (
          <Background
            variant={BackgroundVariant.Lines}
            gap={[10000, 24]}
            color="rgba(200, 200, 200, 0.4)"
            lineWidth={1}
          />
        )
      case 'dots':
        return (
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.5}
            color="rgba(150, 150, 150, 0.5)"
          />
        )
      default:
        return null
    }
  }

  return (
    <CanvasSettingsProvider>
      <div className="mindmap-canvas">
        <div className="canvas-toolbar">
          <button onClick={recalculateLayout} className="toolbar-button">
            Auto Layout
          </button>
          <div className="toolbar-hint">
            Tab: Add Child | Enter: Add Below | Cmd+Del: Delete | F2: Edit
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
          selectionOnDrag={true}
          selectionMode={SelectionMode.Partial}
          panOnDrag={[2]}
          panOnScroll={true}
          zoomOnScroll={false}
          deleteKeyCode={null}
          selectionKeyCode={null}
          disableKeyboardA11y={true}
        >
          <Controls />
          {renderBackground()}
        </ReactFlow>
      </div>
    </CanvasSettingsProvider>
  )
}
