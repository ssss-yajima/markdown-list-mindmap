import { create } from 'zustand'
import type { FileIndex, FileInfo } from '../types/file'
import { fileStorage } from '../utils/storage'

interface FileStoreState {
  index: FileIndex
  isLoaded: boolean

  initialize: () => void
  createFile: (name?: string) => FileInfo
  deleteFile: (fileId: string) => boolean
  renameFile: (fileId: string, newName: string) => void
  setActiveFile: (fileId: string) => void
  updateFileTimestamp: (fileId: string) => void
  getActiveFile: () => FileInfo | null
}

const INITIAL_INDEX: FileIndex = {
  version: 1,
  files: [],
  activeFileId: null,
}

export const useFileStore = create<FileStoreState>((set, get) => ({
  index: INITIAL_INDEX,
  isLoaded: false,

  initialize: () => {
    const index = fileStorage.initialize()
    set({ index, isLoaded: true })
  },

  createFile: (name?: string) => {
    const { index } = get()
    const fileName = name || `新しいマインドマップ ${index.files.length + 1}`
    const fileInfo = fileStorage.createFile(fileName)

    const newIndex: FileIndex = {
      ...index,
      files: [...index.files, fileInfo],
      activeFileId: fileInfo.id,
    }

    fileStorage.saveIndex(newIndex)
    set({ index: newIndex })

    return fileInfo
  },

  deleteFile: (fileId: string) => {
    const { index } = get()

    // 最後の1つは削除不可
    if (index.files.length <= 1) {
      return false
    }

    const fileIndex = index.files.findIndex((f) => f.id === fileId)
    if (fileIndex === -1) {
      return false
    }

    // 削除後のアクティブファイルを決定
    let newActiveFileId = index.activeFileId
    if (index.activeFileId === fileId) {
      // 削除するファイルがアクティブな場合、前後のファイルを選択
      if (fileIndex > 0) {
        newActiveFileId = index.files[fileIndex - 1].id
      } else {
        newActiveFileId = index.files[fileIndex + 1].id
      }
    }

    const newFiles = index.files.filter((f) => f.id !== fileId)
    const newIndex: FileIndex = {
      ...index,
      files: newFiles,
      activeFileId: newActiveFileId,
    }

    // ファイルデータを削除
    fileStorage.deleteFileData(fileId)
    fileStorage.saveIndex(newIndex)
    set({ index: newIndex })

    return true
  },

  renameFile: (fileId: string, newName: string) => {
    const { index } = get()

    const newFiles = index.files.map((f) =>
      f.id === fileId ? { ...f, name: newName, updatedAt: Date.now() } : f,
    )

    const newIndex: FileIndex = {
      ...index,
      files: newFiles,
    }

    fileStorage.saveIndex(newIndex)
    set({ index: newIndex })
  },

  setActiveFile: (fileId: string) => {
    const { index } = get()

    if (!index.files.some((f) => f.id === fileId)) {
      return
    }

    const newIndex: FileIndex = {
      ...index,
      activeFileId: fileId,
    }

    fileStorage.saveIndex(newIndex)
    set({ index: newIndex })
  },

  updateFileTimestamp: (fileId: string) => {
    const { index } = get()

    const newFiles = index.files.map((f) =>
      f.id === fileId ? { ...f, updatedAt: Date.now() } : f,
    )

    const newIndex: FileIndex = {
      ...index,
      files: newFiles,
    }

    fileStorage.saveIndex(newIndex)
    set({ index: newIndex })
  },

  getActiveFile: () => {
    const { index } = get()
    if (!index.activeFileId) return null
    return index.files.find((f) => f.id === index.activeFileId) || null
  },
}))
