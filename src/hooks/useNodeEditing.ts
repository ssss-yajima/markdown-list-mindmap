import { useState, useRef, useEffect, useCallback } from 'react'
import { useMindMapStore } from '../stores/mindMapStore'

interface UseNodeEditingProps {
  nodeId: string
  label: string
}

interface UseNodeEditingReturn {
  isEditing: boolean
  editText: string
  setEditText: (text: string) => void
  inputRef: React.RefObject<HTMLInputElement>
  handleInputBlur: () => void
  handleInputKeyDown: (e: React.KeyboardEvent) => void
}

/**
 * ノード編集状態を管理するカスタムフック
 */
export function useNodeEditing({
  nodeId,
  label,
}: UseNodeEditingProps): UseNodeEditingReturn {
  const {
    editingNodeId,
    setEditingNodeId,
    addChildNode,
    addSiblingNode,
    addSiblingNodeBefore,
    updateNodeText,
  } = useMindMapStore()

  const isEditing = editingNodeId === nodeId
  const [editText, setEditText] = useState(label)
  const inputRef = useRef<HTMLInputElement>(null)

  // フォーカス管理
  useEffect(() => {
    if (isEditing && inputRef.current) {
      // React Flowがフォーカスを奪う可能性があるため、複数回フォーカスを試行
      const focusInput = () => {
        if (inputRef.current) {
          inputRef.current.focus()
          inputRef.current.select()
        }
      }

      // 即座に試行
      focusInput()

      // 遅延して再試行（React Flowの再レンダリング後）
      const timer1 = setTimeout(focusInput, 50)
      const timer2 = setTimeout(focusInput, 100)

      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
      }
    }
  }, [isEditing])

  // ラベル同期
  useEffect(() => {
    setEditText(label)
  }, [label])

  const handleInputBlur = useCallback(() => {
    if (editText.trim() && editText !== label) {
      updateNodeText(nodeId, editText.trim())
    } else {
      setEditingNodeId(null)
      setEditText(label)
    }
  }, [editText, label, nodeId, updateNodeText, setEditingNodeId])

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // IME入力中（日本語変換中など）は処理をスキップ
      if (e.nativeEvent.isComposing) {
        return
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        // テキストを確定
        if (editText.trim() && editText !== label) {
          updateNodeText(nodeId, editText.trim())
        }
        // 新ノード作成（自動で編集モードになる）
        if (e.shiftKey) {
          addSiblingNodeBefore(nodeId) // 上に追加
        } else {
          addSiblingNode(nodeId) // 下に追加
        }
      } else if (e.key === 'Tab') {
        e.preventDefault()
        // テキストを確定
        if (editText.trim() && editText !== label) {
          updateNodeText(nodeId, editText.trim())
        }
        addChildNode(nodeId) // 子ノード追加
      } else if (e.key === 'Escape') {
        setEditText(label)
        setEditingNodeId(null)
      }
    },
    [editText, label, nodeId, updateNodeText, setEditingNodeId, addSiblingNode, addSiblingNodeBefore, addChildNode],
  )

  return {
    isEditing,
    editText,
    setEditText,
    inputRef,
    handleInputBlur,
    handleInputKeyDown,
  }
}
