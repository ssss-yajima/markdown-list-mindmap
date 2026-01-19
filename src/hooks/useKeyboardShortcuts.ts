/**
 * マインドマップのキーボードショートカットを処理するフック
 *
 * Tab: 子ノード追加
 * Enter: 兄弟ノード追加
 * Cmd/Ctrl + Backspace/Delete: ノード削除
 * F2: テキスト編集開始
 * Escape: 編集キャンセル / 選択解除
 */

import { useEffect, useCallback } from 'react'
import { useMindMapStore } from '../stores/mindMapStore'

export function useKeyboardShortcuts() {
  const {
    selectedNodeId,
    editingNodeId,
    setSelectedNodeId,
    setEditingNodeId,
    addChildNode,
    addSiblingNode,
    addSiblingNodeBefore,
    deleteNode,
  } = useMindMapStore()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // 編集中は特定のキーのみ処理
      if (editingNodeId) {
        if (e.key === 'Escape') {
          setEditingNodeId(null)
        }
        return
      }

      // ノードが選択されていない場合は何もしない
      if (!selectedNodeId) return

      // 入力フォーカスがある場合は処理しない（テキストエリア等）
      const activeElement = document.activeElement
      if (
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement
      ) {
        return
      }

      switch (e.key) {
        case 'Tab':
          e.preventDefault()
          addChildNode(selectedNodeId)
          break

        case 'Enter':
          e.preventDefault()
          if (e.shiftKey) {
            addSiblingNodeBefore(selectedNodeId) // 上に追加
          } else {
            addSiblingNode(selectedNodeId) // 下に追加
          }
          break

        case 'Backspace':
        case 'Delete':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            deleteNode(selectedNodeId)
          }
          break

        case 'F2':
          e.preventDefault()
          setEditingNodeId(selectedNodeId)
          break

        case 'Escape':
          e.preventDefault()
          setSelectedNodeId(null)
          break

        default:
          break
      }
    },
    [
      selectedNodeId,
      editingNodeId,
      setSelectedNodeId,
      setEditingNodeId,
      addChildNode,
      addSiblingNode,
      addSiblingNodeBefore,
      deleteNode,
    ],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])
}
