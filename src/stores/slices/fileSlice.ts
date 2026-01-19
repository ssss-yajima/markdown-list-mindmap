import type { MindMapState, SAMPLE_MARKDOWN } from '../mindMapStore';
import type { StoredData } from '../../types/mindMap';
import { parseAndEnsureIds } from '../../utils/markdownParser';
import { treeToFlow } from '../../utils/treeToFlow';
import { treeToMarkdown } from '../../utils/treeToMarkdown';
import { fileStorage } from '../../utils/storage';

type SetState = (partial: Partial<MindMapState> | ((state: MindMapState) => Partial<MindMapState>)) => void;
type GetState = () => MindMapState;

export interface FileSlice {
  loadFromStorage: () => void;
  saveToStorage: () => void;
  loadFileData: (fileId: string) => void;
  getFileData: () => StoredData;
  saveActiveFile: () => void;
  resetToDefault: () => void;
}

export function createFileSlice(
  set: SetState,
  get: GetState,
  sampleMarkdown: typeof SAMPLE_MARKDOWN
): FileSlice {
  return {
    loadFromStorage: () => {
      // 後方互換性: 直接呼ばれた場合は何もしない（loadFileDataを使用）
    },

    saveToStorage: () => {
      // 後方互換性: saveActiveFileを呼び出す
      get().saveActiveFile();
    },

    loadFileData: (fileId: string) => {
      const data = fileStorage.loadFileData(fileId);
      if (data) {
        const { parsed, markdownWithIds, hasChanges } = parseAndEnsureIds(data.markdown);
        const finalMarkdown = hasChanges ? markdownWithIds : data.markdown;
        const displayMarkdown = treeToMarkdown(parsed.items, { embedIds: false });
        const { nodes, edges } = treeToFlow(parsed, data.metadata);

        set({
          markdown: finalMarkdown,
          displayMarkdown,
          metadata: data.metadata,
          parsed,
          nodes,
          edges,
          activeFileId: fileId,
          selectedNodeId: null,
          editingNodeId: null,
        });

        if (hasChanges) {
          get().saveActiveFile();
        }
      } else {
        // ファイルデータがない場合はデフォルト状態で初期化
        set({ activeFileId: fileId });
        get().resetToDefault();
      }
    },

    getFileData: () => {
      const { markdown, metadata } = get();
      return { markdown, metadata };
    },

    saveActiveFile: () => {
      const { activeFileId, markdown, metadata } = get();
      if (activeFileId) {
        fileStorage.saveFileData(activeFileId, { markdown, metadata });
      }
    },

    resetToDefault: () => {
      // 既存のparsedをクリアしてから新しいマークダウンを設定
      // これにより、syncMarkdownWithTreeが既存のIDを再利用しないようにする
      set({ parsed: null });
      get().setMarkdown(sampleMarkdown);
    },
  };
}
