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
  // 状態のみ selector で取得（再レンダリング最適化）
  const selectedNodeId = useMindMapStore((s) => s.selectedNodeId)
  const selectedNodeIds = useMindMapStore((s) => s.selectedNodeIds)
  const editingNodeId = useMindMapStore((s) => s.editingNodeId)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // 編集中は特定のキーのみ処理
      if (editingNodeId) {
        if (e.key === 'Escape') {
          useMindMapStore.getState().setEditingNodeId(null)
        }
        return
      }

      // 入力フォーカスがある場合は処理しない（テキストエリア等）
      const activeElement = document.activeElement
      if (
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement
      ) {
        return
      }

      // アクションは getState() で取得（依存配列の最適化）
      const store = useMindMapStore.getState()

      // 複数選択時の処理
      if (selectedNodeIds.length > 1) {
        switch (e.key) {
          case 'Backspace':
          case 'Delete':
            if (e.metaKey || e.ctrlKey) {
              e.preventDefault()
              store.deleteNodes(selectedNodeIds)
            }
            break
          case 'Escape':
            e.preventDefault()
            store.setSelectedNodeId(null)
            break
          default:
            break
        }
        return
      }

      // 単一選択時の処理
      if (!selectedNodeId) return

      switch (e.key) {
        case 'Tab':
          e.preventDefault()
          store.addChildNode(selectedNodeId)
          break

        case 'Enter':
          e.preventDefault()
          if (e.shiftKey) {
            store.addSiblingNodeBefore(selectedNodeId)
          } else {
            store.addSiblingNode(selectedNodeId)
          }
          break

        case 'Backspace':
        case 'Delete':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            store.deleteNode(selectedNodeId)
          }
          break

        case 'F2':
          e.preventDefault()
          store.setEditingNodeId(selectedNodeId)
          break

        case 'Escape':
          e.preventDefault()
          store.setSelectedNodeId(null)
          break

        default:
          break
      }
    },
    [selectedNodeId, selectedNodeIds, editingNodeId],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])
}
