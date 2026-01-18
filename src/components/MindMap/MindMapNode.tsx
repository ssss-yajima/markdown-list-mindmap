import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { MindMapNode as MindMapNodeType } from '../../types/mindMap';
import { useMindMapStore } from '../../stores/mindMapStore';
import './MindMapNode.css';

export const MindMapNode = memo(function MindMapNode({
  id,
  data,
  selected,
}: NodeProps<MindMapNodeType>) {
  const { label, level, hasChildren, expanded } = data;

  const {
    editingNodeId,
    setEditingNodeId,
    addChildNode,
    updateNodeText,
    toggleNodeExpanded,
  } = useMindMapStore();

  const isEditing = editingNodeId === id;
  const [editText, setEditText] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditText(label);
  }, [label]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingNodeId(id);
    },
    [id, setEditingNodeId]
  );

  const handleInputBlur = useCallback(() => {
    if (editText.trim() && editText !== label) {
      updateNodeText(id, editText.trim());
    } else {
      setEditingNodeId(null);
      setEditText(label);
    }
  }, [editText, label, id, updateNodeText, setEditingNodeId]);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (editText.trim() && editText !== label) {
          updateNodeText(id, editText.trim());
        } else {
          setEditingNodeId(null);
        }
      } else if (e.key === 'Escape') {
        setEditText(label);
        setEditingNodeId(null);
      }
    },
    [editText, label, id, updateNodeText, setEditingNodeId]
  );

  const handleAddChild = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      addChildNode(id);
    },
    [id, addChildNode]
  );

  const handleExpandToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (hasChildren) {
        toggleNodeExpanded(id);
      }
    },
    [id, hasChildren, toggleNodeExpanded]
  );

  return (
    <div
      className={`mindmap-node level-${level} ${selected ? 'selected' : ''} ${isEditing ? 'editing' : ''}`}
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
  );
});
