import { useState, useCallback, type ReactNode } from 'react';
import './SplitPane.css';

interface SplitPaneProps {
  left: ReactNode;
  right: ReactNode;
  defaultLeftWidth?: number;
  minWidth?: number;
}

export function SplitPane({
  left,
  right,
  defaultLeftWidth = 400,
  minWidth = 200,
}: SplitPaneProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const newWidth = Math.max(minWidth, Math.min(e.clientX, window.innerWidth - minWidth));
      setLeftWidth(newWidth);
    },
    [isDragging, minWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      className={`split-pane ${isDragging ? 'dragging' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="split-pane-left" style={{ width: leftWidth }}>
        {left}
      </div>
      <div className="split-pane-divider" onMouseDown={handleMouseDown} />
      <div className="split-pane-right">
        {right}
      </div>
    </div>
  );
}
