import { memo, useCallback } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { MindMapNode as MindMapNodeType } from '../../types/mindMap'
import { useMindMapStore } from '../../stores/mindMapStore'
import { useCanvasSettings } from '../../contexts/CanvasSettingsContext'
import { useNodeEditing } from '../../hooks/useNodeEditing'
import './MindMapNode.css'

export const MindMapNode = memo(function MindMapNode({
  id,
  data,
  selected,
}: NodeProps<MindMapNodeType>) {
  const { label, level, hasChildren, expanded, direction = 'right' } = data
  const { nodeStyle, fontStyle } = useCanvasSettings()

  // 方向に応じてハンドル位置を決定
  const targetPosition = direction === 'right' ? Position.Left : Position.Right
  const sourcePosition = direction === 'right' ? Position.Right : Position.Left

  const {
    setEditingNodeId,
    addChildNode,
    toggleNodeExpanded,
  } = useMindMapStore()

  const {
    isEditing,
    editText,
    setEditText,
    inputRef,
    handleInputBlur,
    handleInputKeyDown,
  } = useNodeEditing({ nodeId: id, label })

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setEditingNodeId(id)
    },
    [id, setEditingNodeId],
  )

  const handleAddChild = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      addChildNode(id)
    },
    [id, addChildNode],
  )

  const handleExpandToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (hasChildren) {
        toggleNodeExpanded(id)
      }
    },
    [id, hasChildren, toggleNodeExpanded],
  )

  const directionClass = direction === 'left' ? 'direction-left' : ''

  return (
    <div
      className={`mindmap-node level-${level} ${selected ? 'selected' : ''} ${isEditing ? 'editing' : ''} style-${nodeStyle} font-${fontStyle} ${directionClass}`}
      onDoubleClick={handleDoubleClick}
    >
      {level > 0 && (
        <Handle
          type="target"
          position={targetPosition}
          id={targetPosition === Position.Left ? 'left' : 'right'}
        />
      )}

      <div className="node-content">
        {hasChildren && (
          <button
            className="expand-button"
            onClick={handleExpandToggle}
            title={expanded ? '折りたたむ' : '展開する'}
          >
            {expanded ? '▼' : '▶'}
          </button>
        )}

        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className="node-input"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="node-label">{label}</span>
        )}

        <button
          className="add-child-button"
          onClick={handleAddChild}
          title="子ノードを追加 (Tab)"
        >
          +
        </button>
      </div>

      {level === 0 ? (
        <>
          <Handle type="source" position={Position.Right} id="right" />
          <Handle type="source" position={Position.Left} id="left" />
        </>
      ) : (
        <Handle
          type="source"
          position={sourcePosition}
          id={sourcePosition === Position.Right ? 'right' : 'left'}
        />
      )}
    </div>
  )
})
