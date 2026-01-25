import type { MindMapState } from '../mindMapStore';
import type { MindMapMetadata, LayoutDirection } from '../../types/mindMap';
import type { ParsedMarkdown } from '../../types/markdown';
import { parseAndEnsureIds, syncMarkdownWithTree } from '../../utils/markdownParser';
import { treeToFlow } from '../../utils/treeToFlow';
import { calculateLayout } from '../../utils/layoutEngine';
import { treeToMarkdown } from '../../utils/treeToMarkdown';

type SetState = (partial: Partial<MindMapState> | ((state: MindMapState) => Partial<MindMapState>)) => void;
type GetState = () => MindMapState;

export interface MarkdownSlice {
  setMarkdown: (markdown: string) => void;
}

export function createMarkdownSlice(
  set: SetState,
  get: GetState
): MarkdownSlice {
  return {
    setMarkdown: (markdown: string) => {
      const { parsed: existingParsed, metadata } = get();

      // 入力にIDがあるか確認
      const hasIds = /<!--\s*id:[a-zA-Z0-9]+\s*-->/.test(markdown);

      let parsed: ParsedMarkdown;
      let finalMarkdown: string;

      if (hasIds) {
        // IDがある場合は通常のパース（parseAndEnsureIds）
        const result = parseAndEnsureIds(markdown);
        parsed = result.parsed;
        finalMarkdown = result.markdownWithIds;
      } else {
        // IDがない場合は既存ツリーとマッチングして同期
        const result = syncMarkdownWithTree(markdown, existingParsed?.items ?? null);
        parsed = result.parsed;
        finalMarkdown = result.markdownWithIds;
      }

      // 表示用マークダウンを生成（IDなし）
      const displayMarkdown = treeToMarkdown(parsed.items, { embedIds: false });

      // 新規入力かどうかを判定して、初期レイアウトでは空のメタデータを渡す
      const isNewInput = !hasIds && Object.keys(metadata.nodeMetadata).length === 0;

      // 既存のdirection情報を保持
      const directionOverrides: Record<string, LayoutDirection> = {};
      if (!isNewInput) {
        for (const [id, meta] of Object.entries(metadata.nodeMetadata)) {
          if (meta.direction) {
            directionOverrides[id] = meta.direction;
          }
        }
      }

      const updatedNodeMetadata = calculateLayout(
        parsed.items,
        isNewInput ? {} : metadata.nodeMetadata,
        undefined,
        isNewInput ? undefined : directionOverrides
      );

      const updatedMetadata: MindMapMetadata = {
        ...metadata,
        nodeMetadata: updatedNodeMetadata,
        lastModified: Date.now(),
      };

      const { nodes, edges } = treeToFlow(parsed, updatedMetadata);

      set({
        markdown: finalMarkdown,
        displayMarkdown,
        parsed,
        metadata: updatedMetadata,
        nodes,
        edges,
      });

      get().saveToStorage();
    },
  };
}
