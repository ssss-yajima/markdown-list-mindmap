import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BackgroundStyle = 'none' | 'grid' | 'ruled' | 'dots';
export type NodeStyle = 'none' | 'underline' | 'border';
export type FontStyle = 'handwriting' | 'system';

interface ConfigState {
  backgroundStyle: BackgroundStyle;
  nodeStyle: NodeStyle;
  fontStyle: FontStyle;
  setBackgroundStyle: (style: BackgroundStyle) => void;
  setNodeStyle: (style: NodeStyle) => void;
  setFontStyle: (style: FontStyle) => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      backgroundStyle: 'ruled',
      nodeStyle: 'underline',
      fontStyle: 'handwriting',
      setBackgroundStyle: (style) => set({ backgroundStyle: style }),
      setNodeStyle: (style) => set({ nodeStyle: style }),
      setFontStyle: (style) => set({ fontStyle: style }),
    }),
    {
      name: 'mindmap-config',
    }
  )
);
