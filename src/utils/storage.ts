import type { StoredData } from '../types/mindMap'
import type { FileIndex, FileInfo } from '../types/file'

// 旧キー（単一ファイル）
const LEGACY_STORAGE_KEY = 'markdown-mindmap-data'

// 新キー（複数ファイル）
const FILE_INDEX_KEY = 'mindmap-file-index'
const FILE_DATA_PREFIX = 'mindmap-file-'

/**
 * ユニークなIDを生成
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}

/**
 * ファイルデータ用のストレージキーを生成
 */
function getFileDataKey(fileId: string): string {
  return `${FILE_DATA_PREFIX}${fileId}`
}

/**
 * 複数ファイル対応のストレージAPI
 */
export const fileStorage = {
  /**
   * ファイルインデックスを読み込む
   */
  loadIndex(): FileIndex | null {
    try {
      const data = localStorage.getItem(FILE_INDEX_KEY)
      return data ? JSON.parse(data) : null
    } catch (e) {
      console.error('Failed to load file index:', e)
      return null
    }
  },

  /**
   * ファイルインデックスを保存
   */
  saveIndex(index: FileIndex): void {
    try {
      localStorage.setItem(FILE_INDEX_KEY, JSON.stringify(index))
    } catch (e) {
      console.error('Failed to save file index:', e)
    }
  },

  /**
   * 特定ファイルのデータを読み込む
   */
  loadFileData(fileId: string): StoredData | null {
    try {
      const key = getFileDataKey(fileId)
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : null
    } catch (e) {
      console.error(`Failed to load file data (${fileId}):`, e)
      return null
    }
  },

  /**
   * 特定ファイルのデータを保存
   */
  saveFileData(fileId: string, data: StoredData): void {
    try {
      const key = getFileDataKey(fileId)
      localStorage.setItem(key, JSON.stringify(data))
    } catch (e) {
      console.error(`Failed to save file data (${fileId}):`, e)
    }
  },

  /**
   * 特定ファイルのデータを削除
   */
  deleteFileData(fileId: string): void {
    try {
      const key = getFileDataKey(fileId)
      localStorage.removeItem(key)
    } catch (e) {
      console.error(`Failed to delete file data (${fileId}):`, e)
    }
  },

  /**
   * 新規ファイルを作成
   */
  createFile(name: string): FileInfo {
    const now = Date.now()
    return {
      id: generateId(),
      name,
      createdAt: now,
      updatedAt: now,
    }
  },

  /**
   * 旧データがあるかチェック
   */
  hasLegacyData(): boolean {
    return localStorage.getItem(LEGACY_STORAGE_KEY) !== null
  },

  /**
   * 旧データを読み込む
   */
  loadLegacyData(): StoredData | null {
    try {
      const data = localStorage.getItem(LEGACY_STORAGE_KEY)
      return data ? JSON.parse(data) : null
    } catch (e) {
      console.error('Failed to load legacy data:', e)
      return null
    }
  },

  /**
   * 旧データを削除
   */
  clearLegacyData(): void {
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  },

  /**
   * 旧データから新形式へマイグレーション
   */
  migrateFromLegacy(): FileIndex | null {
    const legacyData = this.loadLegacyData()
    if (!legacyData) return null

    const fileInfo = this.createFile('マイマインドマップ')
    const index: FileIndex = {
      version: 1,
      files: [fileInfo],
      activeFileId: fileInfo.id,
    }

    // 新形式で保存
    this.saveIndex(index)
    this.saveFileData(fileInfo.id, legacyData)

    // 旧データを削除
    this.clearLegacyData()

    return index
  },

  /**
   * 初期化（マイグレーションを含む）
   */
  initialize(): FileIndex {
    // 既に新形式がある場合はそれを使用
    let index = this.loadIndex()
    if (index) return index

    // 旧データがある場合はマイグレーション
    if (this.hasLegacyData()) {
      const migratedIndex = this.migrateFromLegacy()
      if (migratedIndex) return migratedIndex
    }

    // 新規作成
    const fileInfo = this.createFile('新しいマインドマップ')
    index = {
      version: 1,
      files: [fileInfo],
      activeFileId: fileInfo.id,
    }
    this.saveIndex(index)
    return index
  },
}

/**
 * 後方互換性のための旧API（単一ファイル用）
 * @deprecated fileStorageを使用してください
 */
export const storage = {
  load(): StoredData | null {
    try {
      const data = localStorage.getItem(LEGACY_STORAGE_KEY)
      return data ? JSON.parse(data) : null
    } catch (e) {
      console.error('Failed to load from localStorage:', e)
      return null
    }
  },

  save(data: StoredData): void {
    try {
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(data))
    } catch (e) {
      console.error('Failed to save to localStorage:', e)
    }
  },

  clear(): void {
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  },
}
