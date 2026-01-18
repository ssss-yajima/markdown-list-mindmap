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
