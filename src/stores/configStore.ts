import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type BackgroundStyle = 'none' | 'grid' | 'ruled' | 'dots'
export type NodeStyle = 'none' | 'underline' | 'border'
export type FontStyle = 'handwriting' | 'system'

interface ConfigState {
  backgroundStyle: BackgroundStyle
  nodeStyle: NodeStyle
  fontStyle: FontStyle
  autoCenterEnabled: boolean
  setBackgroundStyle: (style: BackgroundStyle) => void
  setNodeStyle: (style: NodeStyle) => void
  setFontStyle: (style: FontStyle) => void
  setAutoCenterEnabled: (enabled: boolean) => void
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      backgroundStyle: 'grid',
      nodeStyle: 'none',
      fontStyle: 'system',
      autoCenterEnabled: true,
      setBackgroundStyle: (style) => set({ backgroundStyle: style }),
      setNodeStyle: (style) => set({ nodeStyle: style }),
      setFontStyle: (style) => set({ fontStyle: style }),
      setAutoCenterEnabled: (enabled) => set({ autoCenterEnabled: enabled }),
    }),
    {
      name: 'mindmap-config',
    },
  ),
)
