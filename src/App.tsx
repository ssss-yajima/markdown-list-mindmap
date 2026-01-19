import { ReactFlowProvider } from '@xyflow/react'
import { SplitPane } from './components/Layout/SplitPane'
import { MainLayout } from './components/Layout/MainLayout'
import { MarkdownEditor } from './components/Editor/MarkdownEditor'
import { MindMapCanvas } from './components/MindMap/MindMapCanvas'
import { ConfigMenu } from './components/Config/ConfigMenu'
import './App.css'

export function App() {
  return (
    <ReactFlowProvider>
      <div className="app">
        <header className="app-header">
          <h1>Markdown Mind Map</h1>
          <ConfigMenu />
        </header>
        <main className="app-main">
          <MainLayout>
            <SplitPane left={<MarkdownEditor />} right={<MindMapCanvas />} />
          </MainLayout>
        </main>
      </div>
    </ReactFlowProvider>
  )
}
