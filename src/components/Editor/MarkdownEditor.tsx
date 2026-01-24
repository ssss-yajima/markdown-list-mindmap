import { useCallback, useState, useEffect, useRef } from 'react'
import { useMindMapStore } from '../../stores/mindMapStore'
import { useDebounce } from '../../hooks/useDebounce'
import { useMarkdownEditorKeyboard } from '../../hooks/useMarkdownEditorKeyboard'
import { useEditorCenter } from '../../hooks/useEditorCenter'
import './MarkdownEditor.css'

export function MarkdownEditor() {
  const { displayMarkdown, setMarkdown } = useMindMapStore()
  const [localValue, setLocalValue] = useState(displayMarkdown)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const debouncedSetMarkdown = useDebounce(setMarkdown, 300)

  const handleValueChange = useCallback(
    (newValue: string) => {
      setLocalValue(newValue)
      debouncedSetMarkdown(newValue)
    },
    [debouncedSetMarkdown],
  )

  const { handleKeyDown } = useMarkdownEditorKeyboard({
    textareaRef,
    value: localValue,
    onChange: handleValueChange,
  })

  useEditorCenter({
    textareaRef,
    value: localValue,
  })

  useEffect(() => {
    setLocalValue(displayMarkdown)
  }, [displayMarkdown])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      handleValueChange(e.target.value)
    },
    [handleValueChange],
  )

  return (
    <div className="markdown-editor">
      <div className="editor-header">
        <h3>Markdown</h3>
        <span className="editor-hint">Use -, *, or 1. for lists</span>
      </div>
      <textarea
        ref={textareaRef}
        className="editor-textarea"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={`- Enter list items
  - Indent to create hierarchy
    - Nest further
- Another topic`}
        spellCheck={false}
      />
    </div>
  )
}
