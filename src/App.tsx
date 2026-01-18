import { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { SplitPane } from './components/Layout/SplitPane';
import { MarkdownEditor } from './components/Editor/MarkdownEditor';
import { MindMapCanvas } from './components/MindMap/MindMapCanvas';
import { useMindMapStore } from './stores/mindMapStore';
import './App.css';

export function App() {
  const { loadFromStorage } = useMindMapStore();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <ReactFlowProvider>
      <div className="app">
        <header className="app-header">
          <h1>Markdown Mind Map</h1>
        </header>
        <main className="app-main">
          <SplitPane
            left={<MarkdownEditor />}
            right={<MindMapCanvas />}
          />
        </main>
      </div>
    </ReactFlowProvider>
  );
}
