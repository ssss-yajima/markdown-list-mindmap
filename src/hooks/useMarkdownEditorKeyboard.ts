import { useCallback, type RefObject } from 'react'

// 空のコンテンツも許容するため(.+)→(.*)
const LIST_ITEM_REGEX = /^(\s*)([-*+]|\d+\.)\s+(.*)$/

interface LineInfo {
  lineStart: number
  lineEnd: number
  lineText: string
  indent: string
  marker: string
  content: string
  isListItem: boolean
}

/**
 * カーソル位置の行情報を取得
 */
function getCurrentLineInfo(text: string, cursorPos: number): LineInfo {
  // 行の開始位置を探す
  let lineStart = cursorPos
  while (lineStart > 0 && text[lineStart - 1] !== '\n') {
    lineStart--
  }

  // 行の終了位置を探す
  let lineEnd = cursorPos
  while (lineEnd < text.length && text[lineEnd] !== '\n') {
    lineEnd++
  }

  const lineText = text.slice(lineStart, lineEnd)
  const match = lineText.match(LIST_ITEM_REGEX)

  if (match) {
    const [, indent, marker, content] = match
    return {
      lineStart,
      lineEnd,
      lineText,
      indent,
      marker,
      content,
      isListItem: true,
    }
  }

  return {
    lineStart,
    lineEnd,
    lineText,
    indent: '',
    marker: '',
    content: lineText,
    isListItem: false,
  }
}

/**
 * 次の番号付きマーカーを生成（例: "1." → "2."）
 */
function getNextOrderedMarker(marker: string): string {
  const num = Number.parseInt(marker, 10)
  return `${num + 1}.`
}

interface UseMarkdownEditorKeyboardOptions {
  textareaRef: RefObject<HTMLTextAreaElement | null>
  value: string
  onChange: (newValue: string) => void
}

/**
 * Markdownエディタのキーボード入力支援フック
 */
export function useMarkdownEditorKeyboard({
  textareaRef,
  value,
  onChange,
}: UseMarkdownEditorKeyboardOptions) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const textarea = textareaRef.current
      if (!textarea) return

      const { selectionStart, selectionEnd } = textarea

      // Enter キー処理
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const lineInfo = getCurrentLineInfo(value, selectionStart)

        if (!lineInfo.isListItem) {
          return // 通常のEnter動作
        }

        e.preventDefault()

        // 空行（マーカーのみ）の場合は箇条書きを解除
        if (lineInfo.content.trim() === '') {
          const before = value.slice(0, lineInfo.lineStart)
          const after = value.slice(lineInfo.lineEnd)
          const newValue = before + after
          onChange(newValue)

          // カーソル位置を設定
          requestAnimationFrame(() => {
            textarea.selectionStart = lineInfo.lineStart
            textarea.selectionEnd = lineInfo.lineStart
          })
          return
        }

        // 行の途中にカーソルがある場合の処理
        const cursorInLine = selectionStart - lineInfo.lineStart
        const markerPart = `${lineInfo.indent}${lineInfo.marker} `
        const contentStart = markerPart.length

        // 次のマーカーを決定
        const nextMarker = /^\d+\.$/.test(lineInfo.marker)
          ? getNextOrderedMarker(lineInfo.marker)
          : lineInfo.marker

        if (cursorInLine < contentStart) {
          // カーソルがマーカー部分にある場合は行末扱い
          const newLine = `\n${lineInfo.indent}${nextMarker} `
          const newValue =
            value.slice(0, lineInfo.lineEnd) +
            newLine +
            value.slice(lineInfo.lineEnd)
          onChange(newValue)

          requestAnimationFrame(() => {
            const newPos = lineInfo.lineEnd + newLine.length
            textarea.selectionStart = newPos
            textarea.selectionEnd = newPos
          })
        } else {
          // カーソル位置で行を分割
          const remainingContent = lineInfo.content.slice(
            cursorInLine - contentStart,
          )
          const currentLineContent = lineInfo.content.slice(
            0,
            cursorInLine - contentStart,
          )
          const newCurrentLine = `${lineInfo.indent}${lineInfo.marker} ${currentLineContent}`
          const newNextLine = `${lineInfo.indent}${nextMarker} ${remainingContent}`

          const finalValue =
            value.slice(0, lineInfo.lineStart) +
            newCurrentLine +
            '\n' +
            newNextLine +
            value.slice(lineInfo.lineEnd)

          onChange(finalValue)

          requestAnimationFrame(() => {
            const newPos =
              lineInfo.lineStart +
              newCurrentLine.length +
              1 +
              lineInfo.indent.length +
              nextMarker.length +
              1
            textarea.selectionStart = newPos
            textarea.selectionEnd = newPos
          })
        }
        return
      }

      // Tab キー処理
      if (e.key === 'Tab') {
        e.preventDefault()

        const lineInfo = getCurrentLineInfo(value, selectionStart)

        if (!lineInfo.isListItem) {
          // 箇条書きでない場合は2スペースを挿入
          const newValue =
            value.slice(0, selectionStart) + '  ' + value.slice(selectionEnd)
          onChange(newValue)

          requestAnimationFrame(() => {
            textarea.selectionStart = selectionStart + 2
            textarea.selectionEnd = selectionStart + 2
          })
          return
        }

        if (e.shiftKey) {
          // Shift+Tab: インデントを削除（-2スペース）
          if (lineInfo.indent.length >= 2) {
            const newIndent = lineInfo.indent.slice(2)
            const newLine = `${newIndent}${lineInfo.marker} ${lineInfo.content}`
            const newValue =
              value.slice(0, lineInfo.lineStart) +
              newLine +
              value.slice(lineInfo.lineEnd)
            onChange(newValue)

            // カーソル位置を調整（2文字分左に移動）
            requestAnimationFrame(() => {
              const newPos = Math.max(lineInfo.lineStart, selectionStart - 2)
              textarea.selectionStart = newPos
              textarea.selectionEnd = newPos
            })
          }
        } else {
          // Tab: インデントを追加（+2スペース）
          const newIndent = lineInfo.indent + '  '
          const newLine = `${newIndent}${lineInfo.marker} ${lineInfo.content}`
          const newValue =
            value.slice(0, lineInfo.lineStart) +
            newLine +
            value.slice(lineInfo.lineEnd)
          onChange(newValue)

          // カーソル位置を調整（2文字分右に移動）
          requestAnimationFrame(() => {
            const newPos = selectionStart + 2
            textarea.selectionStart = newPos
            textarea.selectionEnd = newPos
          })
        }
      }
    },
    [textareaRef, value, onChange],
  )

  return { handleKeyDown }
}
