/**
 * ID管理ユーティリティ
 * マークダウン内のIDコメント形式: <!-- id:xxxxxxxx -->
 */

const ID_COMMENT_REGEX = /<!--\s*id:([a-zA-Z0-9]+)\s*-->/;

/**
 * 短いユニークIDを生成（8文字の英数字）
 */
export function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * テキストからIDコメントを抽出
 * @param text - パース対象のテキスト
 * @returns 抽出されたID、なければnull
 */
export function extractId(text: string): string | null {
  const match = text.match(ID_COMMENT_REGEX);
  return match ? match[1] : null;
}

/**
 * テキストからIDコメントを除去してクリーンなテキストを返す
 * @param text - IDコメントを含むテキスト
 * @returns IDコメントを除去したテキスト
 */
export function removeIdComment(text: string): string {
  return text.replace(ID_COMMENT_REGEX, '').trim();
}

/**
 * テキストにIDコメントを埋め込む
 * @param text - 元のテキスト
 * @param id - 埋め込むID
 * @returns IDコメント付きのテキスト
 */
export function embedId(text: string, id: string): string {
  // 既存のIDコメントがあれば置換
  if (ID_COMMENT_REGEX.test(text)) {
    return text.replace(ID_COMMENT_REGEX, `<!-- id:${id} -->`);
  }
  // なければ末尾に追加
  return `${text} <!-- id:${id} -->`;
}

/**
 * テキストにIDがなければ新規生成して埋め込む
 * @param text - 元のテキスト
 * @returns { text: IDコメント付きテキスト, id: 使用されたID }
 */
export function ensureId(text: string): { text: string; id: string } {
  const existingId = extractId(text);
  if (existingId) {
    return { text, id: existingId };
  }
  const newId = generateId();
  return { text: embedId(text, newId), id: newId };
}

/**
 * フラット化されたノード情報（マッチング用）
 */
interface FlatNode {
  text: string;
  level: number;
  index: number;
  parentIndex: number | null;
  siblingPosition: number;
}

/**
 * ツリーをフラット化してマッチング用のリストを生成
 */
function flattenTree(
  items: { text: string; level: number; children: unknown[] }[],
  parentIndex: number | null = null,
  result: FlatNode[] = []
): FlatNode[] {
  items.forEach((item, siblingPos) => {
    const index = result.length;
    result.push({
      text: item.text,
      level: item.level,
      index,
      parentIndex,
      siblingPosition: siblingPos,
    });
    if ('children' in item && Array.isArray(item.children)) {
      flattenTree(
        item.children as { text: string; level: number; children: unknown[] }[],
        index,
        result
      );
    }
  });
  return result;
}

/**
 * 2つのツリー（既存ツリーと新しいツリー）をマッチングしてID対応を返す
 * マッチングの優先順位:
 * 1. 同じテキスト + 同じ親のテキスト + 同じ兄弟位置
 * 2. 同じテキスト + 同じ親のテキスト
 * 3. 同じテキスト + 同じレベル
 *
 * @param oldItems - 既存のListItemツリー
 * @param newItems - 新しいツリー（パース済み、IDなし）
 * @returns 新しいノードのインデックスから既存IDへのマッピング
 */
export function matchNodes<
  T extends { id: string; text: string; level: number; children: T[] },
  U extends { text: string; level: number; children: U[] },
>(oldItems: T[], newItems: U[]): Map<number, string> {
  const oldFlat = flattenTree(oldItems as unknown as { text: string; level: number; children: unknown[] }[]);
  const newFlat = flattenTree(newItems as unknown as { text: string; level: number; children: unknown[] }[]);

  // 既存ノードのIDを取得するヘルパー
  const getOldId = (flatIndex: number): string => {
    let count = 0;
    const findId = (items: T[]): string | null => {
      for (const item of items) {
        if (count === flatIndex) return item.id;
        count++;
        const found = findId(item.children);
        if (found) return found;
      }
      return null;
    };
    return findId(oldItems) ?? '';
  };

  const result = new Map<number, string>();
  const usedOldIndices = new Set<number>();

  // Pass 1: 完全マッチ（テキスト + 親テキスト + 兄弟位置）
  for (const newNode of newFlat) {
    const newParentText =
      newNode.parentIndex !== null ? newFlat[newNode.parentIndex].text : null;

    for (const oldNode of oldFlat) {
      if (usedOldIndices.has(oldNode.index)) continue;

      const oldParentText =
        oldNode.parentIndex !== null ? oldFlat[oldNode.parentIndex].text : null;

      if (
        newNode.text === oldNode.text &&
        newParentText === oldParentText &&
        newNode.siblingPosition === oldNode.siblingPosition
      ) {
        result.set(newNode.index, getOldId(oldNode.index));
        usedOldIndices.add(oldNode.index);
        break;
      }
    }
  }

  // Pass 2: テキスト + 親テキストマッチ
  for (const newNode of newFlat) {
    if (result.has(newNode.index)) continue;

    const newParentText =
      newNode.parentIndex !== null ? newFlat[newNode.parentIndex].text : null;

    for (const oldNode of oldFlat) {
      if (usedOldIndices.has(oldNode.index)) continue;

      const oldParentText =
        oldNode.parentIndex !== null ? oldFlat[oldNode.parentIndex].text : null;

      if (newNode.text === oldNode.text && newParentText === oldParentText) {
        result.set(newNode.index, getOldId(oldNode.index));
        usedOldIndices.add(oldNode.index);
        break;
      }
    }
  }

  // Pass 3: テキスト + レベルマッチ
  for (const newNode of newFlat) {
    if (result.has(newNode.index)) continue;

    for (const oldNode of oldFlat) {
      if (usedOldIndices.has(oldNode.index)) continue;

      if (newNode.text === oldNode.text && newNode.level === oldNode.level) {
        result.set(newNode.index, getOldId(oldNode.index));
        usedOldIndices.add(oldNode.index);
        break;
      }
    }
  }

  return result;
}
