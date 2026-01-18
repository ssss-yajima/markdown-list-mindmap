import { useState, useRef, useEffect } from 'react';
import {
  useConfigStore,
  type BackgroundStyle,
  type NodeStyle,
  type FontStyle,
} from '../../stores/configStore';
import './ConfigMenu.css';

export function ConfigMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const {
    backgroundStyle,
    nodeStyle,
    fontStyle,
    setBackgroundStyle,
    setNodeStyle,
    setFontStyle,
  } = useConfigStore();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const backgroundOptions: { value: BackgroundStyle; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'grid', label: 'Grid' },
    { value: 'ruled', label: 'Ruled' },
    { value: 'dots', label: 'Dots' },
  ];

  const nodeOptions: { value: NodeStyle; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'underline', label: 'Underline' },
    { value: 'border', label: 'Border' },
  ];

  const fontOptions: { value: FontStyle; label: string }[] = [
    { value: 'handwriting', label: 'Handwriting' },
    { value: 'system', label: 'System' },
  ];

  return (
    <div className="config-menu" ref={menuRef}>
      <button
        className="config-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open config menu"
        aria-expanded={isOpen}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>

      {isOpen && (
        <div className="config-dropdown">
          <div className="config-section">
            <h3 className="config-section-title">Background</h3>
            {backgroundOptions.map((option) => (
              <label key={option.value} className="config-option">
                <input
                  type="radio"
                  name="background"
                  value={option.value}
                  checked={backgroundStyle === option.value}
                  onChange={() => setBackgroundStyle(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>

          <div className="config-section">
            <h3 className="config-section-title">Node</h3>
            {nodeOptions.map((option) => (
              <label key={option.value} className="config-option">
                <input
                  type="radio"
                  name="node"
                  value={option.value}
                  checked={nodeStyle === option.value}
                  onChange={() => setNodeStyle(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>

          <div className="config-section">
            <h3 className="config-section-title">Font</h3>
            {fontOptions.map((option) => (
              <label key={option.value} className="config-option">
                <input
                  type="radio"
                  name="font"
                  value={option.value}
                  checked={fontStyle === option.value}
                  onChange={() => setFontStyle(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
