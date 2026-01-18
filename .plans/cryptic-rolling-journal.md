# IDコメント非表示化 - 実装計画

## 概要
マークダウンテキストエリアに表示されるIDコメント（`<!-- id:xxx -->`）を非表示にし、IDをシステム内部で暗黙的に管理する。

## 現状の問題
- IDコメントがテキストエリアに表示されてユーザーの邪魔になっている
- 現在: `- プロジェクト計画 <!-- id:jva5gmw0 -->`
- 目標: `- プロジェクト計画` のみ表示

## 設計方針
「表示用マークダウン」と「内部用マークダウン」を分離し、ツリー構造をSingle Source of Truthとする。

```
displayMarkdown (IDなし) ← ユーザーに表示
        ↓↑ 同期
parsed.items (ListItemツリー) ← IDはここで管理
        ↓↑ 同期
internalMarkdown (IDあり) ← ストレージ保存用
```

## 実装フェーズ

### Phase 1: 表示分離
ストアに `displayMarkdown` を追加し、エディタに表示するマークダウンからIDを除去する。

**変更ファイル:**
- `src/stores/mindMapStore.ts` - `displayMarkdown` 追加、`setMarkdown` 修正
- `src/components/Editor/MarkdownEditor.tsx` - `displayMarkdown` を使用

### Phase 2: 同期ロジック
マークダウン編集時にIDを保持するための同期ロジックを実装。

**変更ファイル:**
- `src/utils/markdownParser.ts` - `syncMarkdownWithTree` 関数追加
- `src/utils/idManager.ts` - `matchNodes` 関数追加

## 変更ファイル詳細

### 1. `src/stores/mindMapStore.ts`

```typescript
interface MindMapState {
  markdown: string;           // 内部用（IDあり）- 変更なし
  displayMarkdown: string;    // 表示用（IDなし）- 新規追加
  // ... 他は同じ
}

// setMarkdown の修正
setMarkdown: (markdown: string) => {
  // 入力がIDなしの場合、既存ツリーとマッチングしてIDを復元
  const { parsed, markdownWithIds } = syncOrParse(markdown, get().parsed?.items);

  // 表示用マークダウンを生成（IDなし）
  const displayMarkdown = treeToMarkdown(parsed.items, { embedIds: false });

  set({
    markdown: markdownWithIds,  // 内部用
    displayMarkdown,            // 表示用
    parsed,
    // ...
  });
}
```

### 2. `src/components/Editor/MarkdownEditor.tsx`

```typescript
// 変更: markdown → displayMarkdown
const { displayMarkdown, setMarkdown } = useMindMapStore();
const [localValue, setLocalValue] = useState(displayMarkdown);

useEffect(() => {
  setLocalValue(displayMarkdown);
}, [displayMarkdown]);
```

### 3. `src/utils/markdownParser.ts` - 新規関数

```typescript
/**
 * IDなしマークダウンと既存ツリーを同期
 * - 既存ノードとマッチすればIDを保持
 * - 新規行には新しいIDを付与
 */
export function syncMarkdownWithTree(
  newMarkdown: string,
  existingItems: ListItem[] | null
): { parsed: ParsedMarkdown; markdownWithIds: string }
```

**マッチングロジック:**
1. 新マークダウンをパース（ID生成なし）
2. 既存ツリーとレベル・位置・テキストで比較
3. マッチしたノードは既存IDを使用
4. 新規ノードには新規IDを生成

### 4. `src/utils/idManager.ts` - 新規関数

```typescript
/**
 * 2つのツリーをマッチングしてID対応を返す
 */
export function matchNodes(
  oldItems: ListItem[],
  newItems: { text: string; level: number }[]
): Map<number, string>  // newIndex → oldId
```

## エッジケース対応

| ケース | 対応 |
|--------|------|
| 同一テキストの複数ノード | 親ID + 兄弟位置で区別 |
| 行の並び替え | 位置よりテキスト優先でマッチ |
| インデント変更 | テキストでマッチ、レベルは新値 |
| 大量ペースト | マッチできない行は新規IDを付与 |

## 検証方法

1. `npm run dev` で起動
2. 動作確認:
   - テキストエリアにIDコメントが表示されないこと
   - ノード追加（+ボタン）→ マークダウンに反映（IDなし）
   - マークダウン編集 → マインドマップに反映（IDは内部で保持）
   - ページリロード → 状態が復元されること
3. `npm run build` でビルド成功を確認
