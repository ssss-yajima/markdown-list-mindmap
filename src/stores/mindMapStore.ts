import { create } from 'zustand'
import type { XYPosition } from '@xyflow/react'
import type { MindMapNode, MindMapEdge, MindMapMetadata } from '../types/mindMap'
import type { ParsedMarkdown } from '../types/markdown'
import {
  createNodeOperationsSlice,
  createLayoutSlice,
  createFileSlice,
  createMarkdownSlice,
  type NodeOperationsSlice,
  type LayoutSlice,
  type FileSlice,
  type MarkdownSlice,
} from './slices'

// 状態の型定義
interface MindMapStateBase {
  markdown: string           // 内部用（IDコメントあり）
  displayMarkdown: string    // 表示用（IDコメントなし）
  metadata: MindMapMetadata
  parsed: ParsedMarkdown | null
  nodes: MindMapNode[]
  edges: MindMapEdge[]
  selectedNodeId: string | null
  selectedNodeIds: string[]
  editingNodeId: string | null
  activeFileId: string | null // 現在編集中のファイルID
}

// 完全なストア型（状態 + すべてのアクション）
export type MindMapState = MindMapStateBase
  & NodeOperationsSlice
  & LayoutSlice
  & FileSlice
  & MarkdownSlice

const INITIAL_METADATA: MindMapMetadata = {
  version: 1,
  nodeMetadata: {},
  viewport: { x: 0, y: 0, zoom: 1 },
  lastModified: Date.now(),
}

export const SAMPLE_MARKDOWN = `- プロジェクト計画
  - フェーズ1
    - 要件定義
    - 設計
  - フェーズ2
    - 実装
    - テスト
- リソース
  - 人員
  - 予算`

export const useMindMapStore = create<MindMapState>((set, get) => ({
  // 初期状態
  markdown: '',
  displayMarkdown: '',
  metadata: INITIAL_METADATA,
  parsed: null,
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedNodeIds: [],
  editingNodeId: null,
  activeFileId: null,

  // スライスからアクションを展開
  ...createMarkdownSlice(set, get),
  ...createLayoutSlice(set, get),
  ...createFileSlice(set, get, SAMPLE_MARKDOWN),
  ...createNodeOperationsSlice(set, get),
}))

// 型エクスポート（外部使用向け）
export type { MindMapMetadata, MindMapNode, MindMapEdge } from '../types/mindMap'
export type { XYPosition }
