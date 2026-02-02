import type { MindMapState } from '../mindMapStore'
import type { MindMapMetadata, LayoutDirection } from '../../types/mindMap'
import { treeToFlow } from '../../utils/treeToFlow'
import { calculateLayout, mergeLayoutConfig } from '../../utils/layoutEngine'

type SetState = (
  partial:
    | Partial<MindMapState>
    | ((state: MindMapState) => Partial<MindMapState>),
) => void
type GetState = () => MindMapState

export interface LayoutConfigSlice {
  setHorizontalGap: (gap: number) => void
}

const MIN_GAP = 10
const MAX_GAP = 100

export function createLayoutConfigSlice(
  set: SetState,
  get: GetState,
): LayoutConfigSlice {
  return {
    setHorizontalGap: (gap: number) => {
      const { parsed, metadata } = get()
      if (!parsed) return

      // Clamp the value to the allowed range
      const clampedGap = Math.min(MAX_GAP, Math.max(MIN_GAP, gap))

      // Preserve existing direction information
      const directionOverrides: Record<string, LayoutDirection> = {}
      for (const [id, meta] of Object.entries(metadata.nodeMetadata)) {
        if (meta.direction) {
          directionOverrides[id] = meta.direction
        }
      }

      // Create merged config with new horizontalGap
      const layoutConfig = mergeLayoutConfig({ horizontalGap: clampedGap })

      // Recalculate layout with new config
      const newNodeMetadata = calculateLayout(
        parsed.items,
        {},
        layoutConfig,
        directionOverrides,
      )

      const updatedMetadata: MindMapMetadata = {
        ...metadata,
        nodeMetadata: newNodeMetadata,
        layoutConfig: { horizontalGap: clampedGap },
        lastModified: Date.now(),
      }

      const { nodes, edges } = treeToFlow(parsed, updatedMetadata)

      set({
        metadata: updatedMetadata,
        nodes,
        edges,
      })

      get().saveToStorage()
    },
  }
}
