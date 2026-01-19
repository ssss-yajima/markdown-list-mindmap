import { useCallback, createContext, useContext } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  type Node,
  type NodeTypes,
  type OnNodesChange,
  type OnSelectionChangeFunc,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { MindMapNode } from './MindMapNode'
import { useMindMapStore } from '../../stores/mindMapStore'
import {
  useConfigStore,
  type NodeStyle,
  type FontStyle,
} from '../../stores/configStore'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import type { MindMapNodeData } from '../../types/mindMap'
import './MindMapCanvas.css'

interface CanvasSettings {
  nodeStyle: NodeStyle
  fontStyle: FontStyle
}

export const CanvasSettingsContext = createContext<CanvasSettings>({
  nodeStyle: 'none',
  fontStyle: 'system',
})

export const useCanvasSettings = () => useContext(CanvasSettingsContext)

const nodeTypes: NodeTypes = {
  mindmap: MindMapNode,
}

export function MindMapCanvas() {
  const {
    nodes,
    edges,
    updateNodePosition,
    toggleNodeExpanded,
    recalculateLayout,
    setSelectedNodeId,
    setEditingNodeId,
  } = useMindMapStore()

  const { backgroundStyle, nodeStyle, fontStyle } = useConfigStore()

  // キーボードショートカットを有効化
  useKeyboardShortcuts()

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      changes.forEach((change) => {
        if (change.type === 'position' && change.position && !change.dragging) {
          updateNodePosition(change.id, change.position)
        }
      })
    },
    [updateNodePosition],
  )

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      updateNodePosition(node.id, node.position)
    },
    [updateNodePosition],
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
      } else if (selectedNodes.length === 0) {
        setSelectedNodeId(null)
      }
    },
    [setSelectedNodeId],
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
    <CanvasSettingsContext.Provider value={{ nodeStyle, fontStyle }}>
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
          selectNodesOnDrag={false}
          deleteKeyCode={null}
          selectionKeyCode={null}
          disableKeyboardA11y={true}
        >
          <Controls />
          {renderBackground()}
        </ReactFlow>
      </div>
    </CanvasSettingsContext.Provider>
  )
}
