import { useState, useCallback, useEffect } from 'react'
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
    deleteFiles,
    renameFile,
    setActiveFile,
  } = useFileStore()
  const { loadFileData, saveActiveFile, activeFileId } = useMindMapStore()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

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
        const { index: newIndex } = useFileStore.getState()
        if (newIndex.activeFileId) {
          loadFileData(newIndex.activeFileId)
        }
      }
    },
    [index.activeFileId, deleteFile, loadFileData],
  )

  const handleToggleSelect = useCallback((fileId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(fileId)) {
        next.delete(fileId)
      } else {
        next.add(fileId)
      }
      return next
    })
  }, [])

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return

    if (selectedIds.size >= index.files.length) {
      window.alert('Cannot delete all files.')
      return
    }

    const targetFiles = index.files.filter((f) => selectedIds.has(f.id))
    const fileNames = targetFiles.map((f) => `• ${f.name}`).join('\n')
    const confirmed = window.confirm(
      `Delete ${targetFiles.length} file(s)?\n\n${fileNames}`,
    )

    if (!confirmed) return

    const hadActiveFile = index.activeFileId && selectedIds.has(index.activeFileId)
    const deleted = deleteFiles(Array.from(selectedIds))

    if (deleted) {
      if (hadActiveFile) {
        const { index: newIndex } = useFileStore.getState()
        if (newIndex.activeFileId) {
          loadFileData(newIndex.activeFileId)
        }
      }
      setSelectedIds(new Set())
    }
  }, [selectedIds, index.files, index.activeFileId, deleteFiles, loadFileData])

  if (!isLoaded) {
    return <div className="file-list-loading">Loading...</div>
  }

  const canDelete = index.files.length > 1

  return (
    <div className="file-list">
      <div className="file-list-header">
        <span className="file-list-title">
          {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Files'}
        </span>
        <div className="file-list-header-actions">
          {selectedIds.size > 0 && (
            <button
              className="file-bulk-delete-btn"
              onClick={handleBulkDelete}
              title="Delete selected"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                <path
                  fillRule="evenodd"
                  d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"
                />
              </svg>
            </button>
          )}
          <button
            className="file-create-btn"
            onClick={handleCreate}
            title="New file"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
            </svg>
          </button>
        </div>
      </div>
      <div className="file-list-items">
        {index.files.map((file) => (
          <FileListItem
            key={file.id}
            file={file}
            isActive={file.id === index.activeFileId}
            canDelete={canDelete}
            isSelected={selectedIds.has(file.id)}
            onSelect={handleSelect}
            onRename={handleRename}
            onDelete={handleDelete}
            onToggleSelect={handleToggleSelect}
          />
        ))}
      </div>
    </div>
  )
}
