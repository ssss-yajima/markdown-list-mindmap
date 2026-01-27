# master ブランチマージ計画

## 状況分析

### 現在の状態
- **refactor ブランチ (committed)**: 77ed2ee (master にマージ済み)
- **未コミットの変更**: Vitest + React Best Practices リファクタリング (Phase 1-3)
- **master ブランチ**: refactor マージ後に複数の新機能を追加

### master で追加された機能 (refactor マージ後)
1. **左右双方向レイアウト** (`r-to-l`): `layoutEngine.ts` 大幅変更、`LayoutDirection` 型追加
2. **自動センタリング** (`centerize`): `useEditorCenter.ts`, `useViewportCenter.ts`, `ViewportController.tsx` 新規
3. **複数ノード選択・移動・削除** (`multi-select-move`): `selectedNodeIds`, `deleteNodes` 追加
4. **ファイル一括削除** (`multi-delete`): `deleteFiles` 追加
5. **レイアウトタイミング修正** (`fix-autolayout-timing`)

---

## 衝突ファイル分析

| ファイル | 我々の変更 | master の変更 | 解決方針 |
|---------|-----------|--------------|---------|
| `useKeyboardShortcuts.ts` | Selector 最適化 (getState) | `selectedNodeIds`, `deleteNodes` 追加 | master を取り込み、selector 最適化を再適用 |
| `nodeOperationsSlice.ts` | `applyTreeOperation` ヘルパー | `deleteNodes`, `centerTargetNodeId` 追加 | master を取り込み、ヘルパーで新メソッドもラップ |
| `layoutEngine.ts` | `CJK_FULLWIDTH_REGEX` hoist | 方向対応の大規模リファクタ | master を取り込み、regex hoist を再適用 |
| `MindMapCanvas.tsx` | `defaultEdgeOptions` hoist | multi-select, ViewportController 追加 | master を取り込み、hoist を再適用 |
| `MindMapNode.tsx` | インライン関数 useCallback 化 | direction 対応、Handle 動的化 | master を取り込み、useCallback を再適用 |
| `FileList.tsx` | useEffect 統合 | bulk delete, selection 追加 | master を取り込み、useEffect 再統合 |
| `FileListItem.tsx` | React.memo 化 | checkbox 追加 | 両方の変更を保持 |

---

## 実施手順

### Step 1: 現在の変更を一時コミット
```bash
git add -A
git commit -m "WIP: Vitest + React Best Practices refactoring (pre-merge)"
```

### Step 2: master をマージ
```bash
git merge master
```

### Step 3: 衝突解決 (ファイルごと)

#### 3.1 `useKeyboardShortcuts.ts`
- master の `selectedNodeIds`, `deleteNodes` を取り込む
- selector 最適化を再適用:
  ```ts
  const selectedNodeId = useMindMapStore((s) => s.selectedNodeId)
  const selectedNodeIds = useMindMapStore((s) => s.selectedNodeIds)
  const editingNodeId = useMindMapStore((s) => s.editingNodeId)
  // アクションは getState() で取得
  ```

#### 3.2 `nodeOperationsSlice.ts`
- master の `setSelectedNodeIds`, `deleteNodes`, `centerTargetNodeId` を取り込む
- `applyTreeOperation` ヘルパーを再適用し、`deleteNodes` もラップ

#### 3.3 `layoutEngine.ts`
- master の direction 対応を全て取り込む
- `CJK_FULLWIDTH_REGEX` をモジュールスコープに追加

#### 3.4 `MindMapCanvas.tsx`
- master の multi-select, ViewportController を取り込む
- `defaultEdgeOptions` をモジュールスコープに hoist

#### 3.5 `MindMapNode.tsx`
- master の direction 対応を取り込む
- `handleEditTextChange`, `handleInputClick` の useCallback 化を再適用

#### 3.6 `FileList.tsx`
- master の bulk delete, selection を取り込む
- useEffect 統合を再適用

#### 3.7 `FileListItem.tsx`
- master の checkbox を取り込む
- React.memo を維持

### Step 4: 検証
```bash
pnpm test           # 94 tests should pass
pnpm type-check     # TypeScript チェック
pnpm lint           # Biome lint
pnpm build          # ビルド確認
```

### Step 5: マージコミット整理
```bash
git add -A
git commit -m "resolve: merge conflicts with master"
```

---

## 新規ファイル (衝突なし)
master から取り込む:
- `src/hooks/useEditorCenter.ts`
- `src/hooks/useViewportCenter.ts`
- `src/components/MindMap/ViewportController.tsx`
- `src/stores/slices/viewportSlice.ts`
- `src/utils/cursorToNodeId.ts`

refactor の新規テストファイル:
- `src/utils/__tests__/*.test.ts` (7ファイル)
- `src/stores/helpers/__tests__/regenerateFromTree.test.ts`

---

## 検証チェックリスト
- [ ] `pnpm test` — 94 tests all pass
- [ ] `pnpm type-check` — no errors
- [ ] `pnpm lint` — no errors
- [ ] `pnpm build` — success
- [ ] 手動確認: 複数ノード選択・削除が動作する
- [ ] 手動確認: 左右レイアウトが動作する
- [ ] 手動確認: 自動センタリングが動作する
