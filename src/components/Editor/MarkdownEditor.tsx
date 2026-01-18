import { useCallback, useState, useEffect } from 'react';
import { useMindMapStore } from '../../stores/mindMapStore';
import { useDebounce } from '../../hooks/useDebounce';
import './MarkdownEditor.css';

export function MarkdownEditor() {
  const { markdown, setMarkdown } = useMindMapStore();
  const [localValue, setLocalValue] = useState(markdown);

  const debouncedSetMarkdown = useDebounce(setMarkdown, 300);

  useEffect(() => {
    setLocalValue(markdown);
  }, [markdown]);

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
        <span className="editor-hint">箇条書き (-、*、1.) を入力</span>
      </div>
      <textarea
        className="editor-textarea"
        value={localValue}
        onChange={handleChange}
        placeholder={`- 箇条書きを入力
  - インデントで階層化
    - さらにネスト
- 別のトピック`}
        spellCheck={false}
      />
    </div>
  );
}
