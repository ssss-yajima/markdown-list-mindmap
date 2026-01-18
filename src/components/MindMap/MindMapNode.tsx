import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { MindMapNode as MindMapNodeType } from '../../types/mindMap';
import './MindMapNode.css';

export const MindMapNode = memo(function MindMapNode({
  data,
  selected,
}: NodeProps<MindMapNodeType>) {
  const { label, level, hasChildren, expanded } = data;

  return (
    <div
      className={`mindmap-node level-${level} ${selected ? 'selected' : ''}`}
    >
      {level > 0 && (
        <Handle type="target" position={Position.Left} />
      )}

      <div className="node-content">
        {hasChildren && (
          <span className="expand-icon">
            {expanded ? '▼' : '▶'}
          </span>
        )}
        <span className="node-label">{label}</span>
      </div>

      {hasChildren && (
        <Handle type="source" position={Position.Right} />
      )}
    </div>
  );
});
