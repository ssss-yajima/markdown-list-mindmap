import { useEffect, useRef } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useMindMapStore } from '../stores/mindMapStore'
import { useConfigStore } from '../stores/configStore'

const CENTER_ANIMATION_DURATION = 300
const LAYOUT_SETTLE_DELAY = 50

export function useViewportCenter() {
  const { setCenter, getNodes, getViewport } = useReactFlow()
  const centerTargetNodeId = useMindMapStore((state) => state.centerTargetNodeId)
  const setCenterTargetNodeId = useMindMapStore((state) => state.setCenterTargetNodeId)
  const autoCenterEnabled = useConfigStore((state) => state.autoCenterEnabled)

  const lastCenteredNodeIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!centerTargetNodeId) return
    if (!autoCenterEnabled) {
      setCenterTargetNodeId(null)
      return
    }

    // 同じノードへの連続センタリングをスキップ
    if (centerTargetNodeId === lastCenteredNodeIdRef.current) {
      setCenterTargetNodeId(null)
      return
    }

    const timeoutId = setTimeout(() => {
      const nodes = getNodes()
      const targetNode = nodes.find((n) => n.id === centerTargetNodeId)

      if (targetNode) {
        const nodeWidth = targetNode.measured?.width ?? 150
        const nodeHeight = targetNode.measured?.height ?? 40
        const centerX = targetNode.position.x + nodeWidth / 2
        const centerY = targetNode.position.y + nodeHeight / 2
        const { zoom } = getViewport()

        setCenter(centerX, centerY, {
          zoom,
          duration: CENTER_ANIMATION_DURATION,
        })

        lastCenteredNodeIdRef.current = centerTargetNodeId
      }

      setCenterTargetNodeId(null)
    }, LAYOUT_SETTLE_DELAY)

    return () => clearTimeout(timeoutId)
  }, [centerTargetNodeId, autoCenterEnabled, setCenter, getNodes, getViewport, setCenterTargetNodeId])
}
