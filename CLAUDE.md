# CLAUDE.md

## Commands

```bash
npm run dev          # Start dev server (localhost:5173)
npm run build        # Production build (tsc + vite)
npm run lint         # ESLint
npm run type-check   # TypeScript check
npm run test:e2e     # Playwright E2E tests
```

## Architecture

- **State Management**: Zustand store (`src/stores/`)
- **Mind Map Rendering**: @xyflow/react
- **Persistence**: LocalStorage
- **Bidirectional Sync**: ID comments embedded in markdown (`<!-- id:xxx -->`)

## Directory Structure

```
src/
├── components/
│   ├── Editor/       # Markdown text editor
│   ├── MindMap/      # Mind map canvas (React Flow)
│   ├── Config/       # Design settings menu
│   ├── FileManager/  # File list management
│   └── Layout/       # App layout
├── stores/           # Zustand state
├── utils/
│   ├── markdownParser.ts   # MD → Tree
│   ├── treeToFlow.ts       # Tree → React Flow nodes/edges
│   ├── layoutEngine.ts     # Auto layout calculation
│   ├── treeOperations.ts   # Tree CRUD operations
│   └── storage.ts          # LocalStorage persistence
├── hooks/            # Custom React hooks
├── types/            # TypeScript types
└── App.tsx
```
