# CLAUDE.md

## Commands

```bash
pnpm dev          # Start dev server (localhost:5173)
pnpm build        # Production build (tsc + vite)
pnpm lint         # Biome lint
pnpm type-check   # TypeScript check
pnpm test:e2e     # Playwright E2E tests
pnpm format:check # Biome format check
```

## CI

GitHub Actions (`.github/workflows/ci.yml`) で push/PR 時に自動実行:
- biome (lint + format:check)
- type-check
- build
- test-e2e

## UI Language

All UI labels and messages should be in English (not Japanese).

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
