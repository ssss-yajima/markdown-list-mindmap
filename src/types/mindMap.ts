import type { Node, Edge, XYPosition } from '@xyflow/react'

/**
 * ノードのメタデータ（位置情報など）
 */
export interface NodeMetadata {
  id: string
  position: XYPosition
  expanded: boolean
}

/**
 * マインドマップ全体のメタデータ
 */
export interface MindMapMetadata {
  version: number
  nodeMetadata: Record<string, NodeMetadata>
  viewport: {
    x: number
    y: number
    zoom: number
  }
  lastModified: number
}

/**
 * カスタムノードのデータ
 */
export interface MindMapNodeData extends Record<string, unknown> {
  label: string
  level: number
  hasChildren: boolean
  expanded: boolean
  lineNumber: number
}

/**
 * React Flow用のノード型
 */
export type MindMapNode = Node<MindMapNodeData, 'mindmap'>

/**
 * React Flow用のエッジ型
 */
export type MindMapEdge = Edge

/**
 * 保存されるデータ
 */
export interface StoredData {
  markdown: string
  metadata: MindMapMetadata
}
