import { memo, useState, useRef, useEffect, useCallback } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { MindMapNode as MindMapNodeType } from '../../types/mindMap'
import { useMindMapStore } from '../../stores/mindMapStore'
import { useCanvasSettings } from './MindMapCanvas'
import './MindMapNode.css'

export const MindMapNode = memo(function MindMapNode({
  id,
  data,
  selected,
}: NodeProps<MindMapNodeType>) {
  const { label, level, hasChildren, expanded } = data
  const { nodeStyle, fontStyle } = useCanvasSettings()

  const {
    editingNodeId,
    setEditingNodeId,
    addChildNode,
    addSiblingNode,
    addSiblingNodeBefore,
    updateNodeText,
    toggleNodeExpanded,
  } = useMindMapStore()

  const isEditing = editingNodeId === id
  const [editText, setEditText] = useState(label)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      // React Flowがフォーカスを奪う可能性があるため、複数回フォーカスを試行
      const focusInput = () => {
        if (inputRef.current) {
          inputRef.current.focus()
          inputRef.current.select()
        }
      }

      // 即座に試行
      focusInput()

      // 遅延して再試行（React Flowの再レンダリング後）
      const timer1 = setTimeout(focusInput, 50)
      const timer2 = setTimeout(focusInput, 100)

      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
      }
    }
  }, [isEditing])

  useEffect(() => {
    setEditText(label)
  }, [label])

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setEditingNodeId(id)
    },
    [id, setEditingNodeId],
  )

  const handleInputBlur = useCallback(() => {
    if (editText.trim() && editText !== label) {
      updateNodeText(id, editText.trim())
    } else {
      setEditingNodeId(null)
      setEditText(label)
    }
  }, [editText, label, id, updateNodeText, setEditingNodeId])

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // IME入力中（日本語変換中など）は処理をスキップ
      if (e.nativeEvent.isComposing) {
        return
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        // テキストを確定
        if (editText.trim() && editText !== label) {
          updateNodeText(id, editText.trim())
        }
        // 新ノード作成（自動で編集モードになる）
        if (e.shiftKey) {
          addSiblingNodeBefore(id) // 上に追加
        } else {
          addSiblingNode(id) // 下に追加
        }
      } else if (e.key === 'Tab') {
        e.preventDefault()
        // テキストを確定
        if (editText.trim() && editText !== label) {
          updateNodeText(id, editText.trim())
        }
        addChildNode(id) // 子ノード追加
      } else if (e.key === 'Escape') {
        setEditText(label)
        setEditingNodeId(null)
      }
    },
    [
      editText,
      label,
      id,
      updateNodeText,
      setEditingNodeId,
      addSiblingNode,
      addSiblingNodeBefore,
      addChildNode,
    ],
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

  return (
    <div
      className={`mindmap-node level-${level} ${selected ? 'selected' : ''} ${isEditing ? 'editing' : ''} style-${nodeStyle} font-${fontStyle}`}
      onDoubleClick={handleDoubleClick}
    >
      {level > 0 && <Handle type="target" position={Position.Left} />}

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

      <Handle type="source" position={Position.Right} />
    </div>
  )
})
