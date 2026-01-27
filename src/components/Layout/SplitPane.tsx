import { useState, useRef, useCallback, type ReactNode } from 'react'
import './SplitPane.css'

interface SplitPaneProps {
  left: ReactNode
  right: ReactNode
  defaultLeftWidth?: number
  minWidth?: number
}

export function SplitPane({
  left,
  right,
  defaultLeftWidth = 400,
  minWidth = 200,
}: SplitPaneProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth)
  const isDraggingRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback(() => {
    isDraggingRef.current = true
    containerRef.current?.classList.add('dragging')
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDraggingRef.current) return
      const newWidth = Math.max(
        minWidth,
        Math.min(e.clientX, window.innerWidth - minWidth),
      )
      setLeftWidth(newWidth)
    },
    [minWidth],
  )

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false
    containerRef.current?.classList.remove('dragging')
  }, [])

  return (
    <div
      ref={containerRef}
      className="split-pane"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="split-pane-left" style={{ width: leftWidth }}>
        {left}
      </div>
      <div className="split-pane-divider" onMouseDown={handleMouseDown} />
      <div className="split-pane-right">{right}</div>
    </div>
  )
}
