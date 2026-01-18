# マークダウン箇条書き → マインドマップ Webアプリ 実装計画

## 概要
マークダウンの箇条書きをリアルタイムでマインドマップとして可視化するReact Webアプリ

## 技術スタック
- React 18 + TypeScript + Vite
- React Flow (@xyflow/react) - マインドマップ描画
- Zustand - 状態管理
- GitHub Pages - ホスティング

## データ設計
| データ | 保存先 | 用途 |
|--------|--------|------|
| マークダウン | プレーンテキスト | メモアプリとの互換性 |
| ノード位置 | LocalStorage | GUI操作の保存 |

## 実装フェーズ

### Phase 1: プロジェクト初期化
- Vite + React + TypeScriptでプロジェクト作成
- @xyflow/react, zustand インストール
- 型定義ファイル作成

### Phase 2: コア機能
- マークダウンパーサー（箇条書き → ツリー構造）
- ツリー → React Flow ノード/エッジ変換
- 自動レイアウトエンジン

### Phase 3: UI実装
- 左右分割レイアウト（エディタ | マインドマップ）
- マークダウンエディタ（textarea）
- React Flowキャンバス + カスタムノード

### Phase 4: 永続化 & デプロイ
- LocalStorage保存/復元
- GitHub Actions + GitHub Pages設定

## 主要ファイル
```
src/
├── utils/markdownParser.ts   # MDパース
├── utils/treeToFlow.ts       # ノード変換
├── stores/mindMapStore.ts    # 状態管理
├── components/
│   ├── Editor/MarkdownEditor.tsx
│   └── MindMap/MindMapCanvas.tsx
└── App.tsx
```
