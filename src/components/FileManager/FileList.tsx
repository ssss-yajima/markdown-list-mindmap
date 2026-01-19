import { useCallback, useEffect } from 'react'
import { useFileStore } from '../../stores/fileStore'
import { useMindMapStore } from '../../stores/mindMapStore'
import { FileListItem } from './FileListItem'
import './FileManager.css'

export function FileList() {
  const {
    index,
    isLoaded,
    initialize,
    createFile,
    deleteFile,
    renameFile,
    setActiveFile,
  } = useFileStore()
  const { loadFileData, saveActiveFile, activeFileId } = useMindMapStore()

  // 初期化
  useEffect(() => {
    if (!isLoaded) {
      initialize()
    }
  }, [isLoaded, initialize])

  // アクティブファイルの読み込み
  useEffect(() => {
    if (isLoaded && index.activeFileId && index.activeFileId !== activeFileId) {
      loadFileData(index.activeFileId)
    }
  }, [isLoaded, index.activeFileId, activeFileId, loadFileData])

  const handleSelect = useCallback(
    (fileId: string) => {
      if (fileId === index.activeFileId) return

      // 現在のファイルを保存してから切り替え
      saveActiveFile()
      setActiveFile(fileId)
      loadFileData(fileId)
    },
    [index.activeFileId, saveActiveFile, setActiveFile, loadFileData],
  )

  const handleCreate = useCallback(() => {
    // 現在のファイルを保存
    saveActiveFile()

    // 新規ファイル作成
    const newFile = createFile()
    loadFileData(newFile.id)
  }, [saveActiveFile, createFile, loadFileData])

  const handleRename = useCallback(
    (fileId: string, newName: string) => {
      renameFile(fileId, newName)
    },
    [renameFile],
  )

  const handleDelete = useCallback(
    (fileId: string) => {
      const wasActive = fileId === index.activeFileId
      const deleted = deleteFile(fileId)

      if (deleted && wasActive) {
        // 削除されたファイルがアクティブだった場合、新しいアクティブファイルを読み込む
        const { index: newIndex } = useFileStore.getState()
        if (newIndex.activeFileId) {
          loadFileData(newIndex.activeFileId)
        }
      }
    },
    [index.activeFileId, deleteFile, loadFileData],
  )

  if (!isLoaded) {
    return <div className="file-list-loading">読み込み中...</div>
  }

  const canDelete = index.files.length > 1

  return (
    <div className="file-list">
      <div className="file-list-header">
        <span className="file-list-title">ファイル</span>
        <button
          className="file-create-btn"
          onClick={handleCreate}
          title="新規ファイル"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
          </svg>
        </button>
      </div>
      <div className="file-list-items">
        {index.files.map((file) => (
          <FileListItem
            key={file.id}
            file={file}
            isActive={file.id === index.activeFileId}
            canDelete={canDelete}
            onSelect={handleSelect}
            onRename={handleRename}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  )
}
