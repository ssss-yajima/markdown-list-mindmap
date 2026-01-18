import type { ListItem } from '../types/markdown';
import type { NodeMetadata } from '../types/mindMap';

interface LayoutConfig {
  nodeWidth: number;
  nodeHeight: number;
  horizontalGap: number;
  verticalGap: number;
  minVerticalGap: number;
}

const DEFAULT_CONFIG: LayoutConfig = {
  nodeWidth: 250,  // CSSのmax-widthに合わせる
  nodeHeight: 40,
  horizontalGap: 80,
  verticalGap: 20,
  minVerticalGap: 10,
};

/**
 * テキスト長に基づいてノード高さを推定
 * 日本語と英数字で文字幅を区別して計算
 */
function estimateNodeHeight(text: string, config: LayoutConfig): number {
  // ノード内部のテキスト表示幅を計算
  // - 左右パディング: 12px × 2 = 24px
  // - add-child-button: 20px + gap: 6px = 26px
  // - expand-button（子ノードがある場合）: 20px + gap: 6px = 26px
  // 最悪のケース（子ノードあり）を想定し、word-breakの影響も考慮
  // 安全マージンを含めて100pxを差し引く
  const effectiveWidth = config.nodeWidth - 100;

  // 文字幅を推定（日本語は14px、英数字は8px）
  let totalWidth = 0;
  for (const char of text) {
    // 日本語・全角文字の判定（CJK統合漢字、ひらがな、カタカナ、全角記号など）
    if (/[\u3000-\u9FFF\uFF00-\uFFEF]/.test(char)) {
      totalWidth += 14;
    } else {
      totalWidth += 8;
    }
  }

  const lines = Math.ceil(totalWidth / effectiveWidth);
  const lineHeight = 24; // px (実際のCSSレンダリングに合わせて調整)
  const paddingY = 16; // 上下パディング
  return Math.max(config.nodeHeight, lines * lineHeight + paddingY);
}

/**
 * ListItemツリーからIDとテキストのマップを作成
 */
export function buildContentMapFromItems(items: ListItem[]): Record<string, string> {
  const result: Record<string, string> = {};

  function traverse(list: ListItem[]): void {
    for (const item of list) {
      result[item.id] = item.text;
      if (item.children.length > 0) {
        traverse(item.children);
      }
    }
  }

  traverse(items);
  return result;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 2つのバウンディングボックスが重なっているかチェック
 */
function boxesOverlap(a: BoundingBox, b: BoundingBox, margin: number = 0): boolean {
  return !(
    a.x + a.width + margin < b.x ||
    b.x + b.width + margin < a.x ||
    a.y + a.height + margin < b.y ||
    b.y + b.height + margin < a.y
  );
}

/**
 * ノードの位置からバウンディングボックスを作成
 */
function createBox(
  x: number,
  y: number,
  config: LayoutConfig,
  height?: number
): BoundingBox {
  return {
    x,
    y,
    width: config.nodeWidth,
    height: height ?? config.nodeHeight,
  };
}

export function calculateLayout(
  items: ListItem[],
  existingMetadata: Record<string, NodeMetadata>,
  config: LayoutConfig = DEFAULT_CONFIG
): Record<string, NodeMetadata> {
  const result: Record<string, NodeMetadata> = {};
  const placedBoxes: { id: string; box: BoundingBox }[] = [];

  /**
   * サブツリーの高さを計算
   */
  function getSubtreeHeight(item: ListItem): number {
    const nodeHeight = estimateNodeHeight(item.text, config);
    if (item.children.length === 0) {
      return nodeHeight;
    }
    const childrenHeight = item.children.reduce((sum, child) => {
      return sum + getSubtreeHeight(child) + config.verticalGap;
    }, -config.verticalGap);
    return Math.max(nodeHeight, childrenHeight);
  }

  /**
   * 指定位置に重なりがないかチェックし、必要なら調整
   */
  function findNonOverlappingY(
    x: number,
    preferredY: number,
    nodeId: string,
    nodeHeight: number
  ): number {
    const box = createBox(x, preferredY, config, nodeHeight);
    let adjustedY = preferredY;
    let iterations = 0;
    const maxIterations = 100;

    while (iterations < maxIterations) {
      let hasOverlap = false;

      for (const placed of placedBoxes) {
        if (placed.id === nodeId) continue;

        const placedBox = placed.box;
        if (boxesOverlap(box, placedBox, config.minVerticalGap)) {
          hasOverlap = true;
          // 重なっている場合、下にずらす
          adjustedY = placedBox.y + placedBox.height + config.verticalGap;
          box.y = adjustedY;
          break;
        }
      }

      if (!hasOverlap) break;
      iterations++;
    }

    return adjustedY;
  }

  /**
   * サブツリーをレイアウト
   */
  function layoutSubtree(item: ListItem, depth: number, startY: number): number {
    const x = depth * (config.nodeWidth + config.horizontalGap);
    const nodeHeight = estimateNodeHeight(item.text, config);

    // 既存の位置があれば使用（ユーザーがドラッグした位置を保持）
    const existing = existingMetadata[item.id];
    if (existing?.position) {
      result[item.id] = existing;
      placedBoxes.push({
        id: item.id,
        box: createBox(existing.position.x, existing.position.y, config, nodeHeight),
      });

      let childY = startY;
      item.children.forEach((child) => {
        const childHeight = layoutSubtree(child, depth + 1, childY);
        childY += childHeight + config.verticalGap;
      });
      return getSubtreeHeight(item);
    }

    if (item.children.length === 0) {
      const finalY = findNonOverlappingY(x, startY, item.id, nodeHeight);
      result[item.id] = {
        id: item.id,
        position: { x, y: finalY },
        expanded: true,
      };
      placedBoxes.push({
        id: item.id,
        box: createBox(x, finalY, config, nodeHeight),
      });
      return nodeHeight;
    }

    // 子ノードを先にレイアウト
    let childY = startY;
    const childPositions: number[] = [];

    item.children.forEach((child) => {
      childPositions.push(childY);
      const childHeight = layoutSubtree(child, depth + 1, childY);
      childY += childHeight + config.verticalGap;
    });

    // 親を子の中央に配置
    const firstChildMeta = result[item.children[0].id];
    const lastChildMeta = result[item.children[item.children.length - 1].id];

    const firstChildY = firstChildMeta?.position.y ?? childPositions[0];
    const lastChildY = lastChildMeta?.position.y ?? childPositions[childPositions.length - 1];
    const centerY = (firstChildY + lastChildY) / 2;

    const finalY = findNonOverlappingY(x, centerY, item.id, nodeHeight);

    result[item.id] = {
      id: item.id,
      position: { x, y: finalY },
      expanded: true,
    };
    placedBoxes.push({
      id: item.id,
      box: createBox(x, finalY, config, nodeHeight),
    });

    return childY - startY - config.verticalGap;
  }

  let currentY = 0;

  items.forEach((item) => {
    const height = layoutSubtree(item, 0, currentY);
    currentY += height + config.verticalGap * 2;
  });

  // 最終的な衝突解消パスを実行
  const contentMap = buildContentMapFromItems(items);
  const resolved = resolveOverlaps(result, contentMap, config);
  return resolved;
}

/**
 * 重なりを検出して解消するレイアウト調整
 * ユーザーがノードをドラッグした後に呼び出される
 */
export function resolveOverlaps(
  metadata: Record<string, NodeMetadata>,
  contentMap: Record<string, string> = {},
  config: LayoutConfig = DEFAULT_CONFIG
): Record<string, NodeMetadata> {
  const result = { ...metadata };
  const entries = Object.entries(result);

  // 各ノードの高さを計算
  const heightMap: Record<string, number> = {};
  for (const [id] of entries) {
    const text = contentMap[id] ?? '';
    heightMap[id] = estimateNodeHeight(text, config);
  }

  // 全ペアで重なりをチェック
  let hasChanges = true;
  let iterations = 0;
  const maxIterations = 50;

  // 同一深度（X座標が近い）のノード間のみ衝突をチェック
  // 階層間隔（nodeWidth + horizontalGap）に合わせて設定
  const xTolerance = config.nodeWidth + config.horizontalGap;

  while (hasChanges && iterations < maxIterations) {
    hasChanges = false;

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [idA, metaA] = entries[i];
        const [idB, metaB] = entries[j];

        if (!metaA.position || !metaB.position) continue;

        // 同一階層のノードのみ衝突チェック
        const sameDepth = Math.abs(metaA.position.x - metaB.position.x) < xTolerance;
        if (!sameDepth) continue;

        const heightA = heightMap[idA];
        const heightB = heightMap[idB];
        const boxA = createBox(metaA.position.x, metaA.position.y, config, heightA);
        const boxB = createBox(metaB.position.x, metaB.position.y, config, heightB);

        if (boxesOverlap(boxA, boxB, config.minVerticalGap)) {
          // 重なりを解消 - 下にあるノードを下に移動
          if (boxA.y <= boxB.y) {
            const newY = boxA.y + boxA.height + config.verticalGap;
            result[idB] = {
              ...metaB,
              position: { ...metaB.position, y: newY },
            };
            entries[j] = [idB, result[idB]];
          } else {
            const newY = boxB.y + boxB.height + config.verticalGap;
            result[idA] = {
              ...metaA,
              position: { ...metaA.position, y: newY },
            };
            entries[i] = [idA, result[idA]];
          }
          hasChanges = true;
        }
      }
    }

    iterations++;
  }

  return result;
}
