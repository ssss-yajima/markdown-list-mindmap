/**
 * ファイル情報
 */
export interface FileInfo {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

/**
 * ファイルインデックス（LocalStorageに保存）
 */
export interface FileIndex {
  version: number
  files: FileInfo[]
  activeFileId: string | null
}

/**
 * ファイルストアの状態
 */
export interface FileStoreState {
  index: FileIndex
  isLoaded: boolean
}
