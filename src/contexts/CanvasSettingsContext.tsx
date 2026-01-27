import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useConfigStore, type NodeStyle, type FontStyle } from '../stores/configStore';

interface CanvasSettings {
  nodeStyle: NodeStyle;
  fontStyle: FontStyle;
}

const CanvasSettingsContext = createContext<CanvasSettings | null>(null);

interface CanvasSettingsProviderProps {
  children: ReactNode;
}

export function CanvasSettingsProvider({ children }: CanvasSettingsProviderProps) {
  const { nodeStyle, fontStyle } = useConfigStore();
  const value = useMemo(() => ({ nodeStyle, fontStyle }), [nodeStyle, fontStyle]);

  return (
    <CanvasSettingsContext.Provider value={value}>
      {children}
    </CanvasSettingsContext.Provider>
  );
}

export function useCanvasSettings(): CanvasSettings {
  const context = useContext(CanvasSettingsContext);
  if (!context) {
    throw new Error('useCanvasSettings must be used within CanvasSettingsProvider');
  }
  return context;
}
