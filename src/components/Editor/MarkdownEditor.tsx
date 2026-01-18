import { useCallback, useState, useEffect } from 'react';
import { useMindMapStore } from '../../stores/mindMapStore';
import { useDebounce } from '../../hooks/useDebounce';
import './MarkdownEditor.css';

export function MarkdownEditor() {
  const { displayMarkdown, setMarkdown } = useMindMapStore();
  const [localValue, setLocalValue] = useState(displayMarkdown);

  const debouncedSetMarkdown = useDebounce(setMarkdown, 300);

  useEffect(() => {
    setLocalValue(displayMarkdown);
  }, [displayMarkdown]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setLocalValue(value);
      debouncedSetMarkdown(value);
    },
    [debouncedSetMarkdown]
  );

  return (
    <div className="markdown-editor">
      <div className="editor-header">
        <h3>Markdown</h3>
        <span className="editor-hint">Use -, *, or 1. for lists</span>
      </div>
      <textarea
        className="editor-textarea"
        value={localValue}
        onChange={handleChange}
        placeholder={`- Enter list items
  - Indent to create hierarchy
    - Nest further
- Another topic`}
        spellCheck={false}
      />
    </div>
  );
}
