# Markdown List Mind Map

A web application that visualizes markdown lists as mind maps in real-time.

**Demo:** https://ssss-yajima.github.io/markdown-list-mindmap/

## Features

- **Real-time Preview** - Instantly converts markdown lists to mind map visualization
- **Bidirectional Editing** - Edit from both text editor and mind map canvas
- **Multiple Files** - Manage multiple mind maps with local storage
- **Customizable Design** - Configure background style, node appearance, and fonts

## Usage

### Markdown Syntax

```markdown
- Root node
  - Child node 1
    - Grandchild node
  - Child node 2
```

- Start with `-`, `*`, or `1.`
- Use 2-space indentation for nesting

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Tab | Add child node |
| Enter | Add sibling below |
| Shift + Enter | Add sibling above |
| F2 | Edit node label |
| Cmd/Ctrl + Delete | Delete node |

Double-click a node for inline editing.

## Installation

```bash
npm install
```

## Development

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Run ESLint
npm run type-check   # TypeScript check
npm run test:e2e     # Run E2E tests
```

## Tech Stack

- React 18 + TypeScript
- Vite
- [@xyflow/react](https://reactflow.dev/) - Mind map rendering
- Zustand - State management

## License

[MIT](LICENSE)
