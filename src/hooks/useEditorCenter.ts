import { useEffect, useRef } from 'react'
import { useMindMapStore } from '../stores/mindMapStore'
import { useConfigStore } from '../stores/configStore'
import { getNodeIdFromCursor } from '../utils/cursorToNodeId'

const DEBOUNCE_DELAY = 150

interface UseEditorCenterOptions {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  value: string
}

export function useEditorCenter({ textareaRef, value }: UseEditorCenterOptions) {
  const nodes = useMindMapStore((state) => state.nodes)
  const setCenterTargetNodeId = useMindMapStore((state) => state.setCenterTargetNodeId)
  const autoCenterEnabled = useConfigStore((state) => state.autoCenterEnabled)

  const lastValueRef = useRef<string>(value)
  const lastNodeIdRef = useRef<string | null>(null)
  const debounceTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    // テキストが変更されていない場合はスキップ（カーソル移動のみ）
    if (value === lastValueRef.current) return
    lastValueRef.current = value

    if (!autoCenterEnabled) return
    if (!textareaRef.current) return

    // 既存のデバウンスタイマーをクリア
    if (debounceTimeoutRef.current !== null) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = window.setTimeout(() => {
      const textarea = textareaRef.current
      if (!textarea) return

      const cursorPos = textarea.selectionStart
      const nodeId = getNodeIdFromCursor(value, cursorPos, nodes)

      if (!nodeId) return

      // 同じノードへの連続センタリングをスキップ
      if (nodeId === lastNodeIdRef.current) return
      lastNodeIdRef.current = nodeId

      setCenterTargetNodeId(nodeId)
    }, DEBOUNCE_DELAY)

    return () => {
      if (debounceTimeoutRef.current !== null) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [value, nodes, autoCenterEnabled, textareaRef, setCenterTargetNodeId])
}
