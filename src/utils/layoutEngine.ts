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
  nodeWidth: 180,
  nodeHeight: 40,
  horizontalGap: 80,
  verticalGap: 20,
  minVerticalGap: 10,
};

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
  config: LayoutConfig
): BoundingBox {
  return {
    x,
    y,
    width: config.nodeWidth,
    height: config.nodeHeight,
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
    if (item.children.length === 0) {
      return config.nodeHeight;
    }
    const childrenHeight = item.children.reduce((sum, child) => {
      return sum + getSubtreeHeight(child) + config.verticalGap;
    }, -config.verticalGap);
    return Math.max(config.nodeHeight, childrenHeight);
  }

  /**
   * 指定位置に重なりがないかチェックし、必要なら調整
   */
  function findNonOverlappingY(
    x: number,
    preferredY: number,
    nodeId: string
  ): number {
    const box = createBox(x, preferredY, config);
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

    // 既存の位置があれば使用（ユーザーがドラッグした位置を保持）
    const existing = existingMetadata[item.id];
    if (existing?.position) {
      result[item.id] = existing;
      placedBoxes.push({
        id: item.id,
        box: createBox(existing.position.x, existing.position.y, config),
      });

      let childY = startY;
      item.children.forEach((child) => {
        const childHeight = layoutSubtree(child, depth + 1, childY);
        childY += childHeight + config.verticalGap;
      });
      return getSubtreeHeight(item);
    }

    if (item.children.length === 0) {
      const finalY = findNonOverlappingY(x, startY, item.id);
      result[item.id] = {
        id: item.id,
        position: { x, y: finalY },
        expanded: true,
      };
      placedBoxes.push({
        id: item.id,
        box: createBox(x, finalY, config),
      });
      return config.nodeHeight;
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

    const finalY = findNonOverlappingY(x, centerY, item.id);

    result[item.id] = {
      id: item.id,
      position: { x, y: finalY },
      expanded: true,
    };
    placedBoxes.push({
      id: item.id,
      box: createBox(x, finalY, config),
    });

    return childY - startY - config.verticalGap;
  }

  let currentY = 0;

  items.forEach((item) => {
    const height = layoutSubtree(item, 0, currentY);
    currentY += height + config.verticalGap * 2;
  });

  return result;
}

/**
 * 重なりを検出して解消するレイアウト調整
 * ユーザーがノードをドラッグした後に呼び出される
 */
export function resolveOverlaps(
  metadata: Record<string, NodeMetadata>,
  config: LayoutConfig = DEFAULT_CONFIG
): Record<string, NodeMetadata> {
  const result = { ...metadata };
  const entries = Object.entries(result);

  // 全ペアで重なりをチェック
  let hasChanges = true;
  let iterations = 0;
  const maxIterations = 50;

  while (hasChanges && iterations < maxIterations) {
    hasChanges = false;

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [idA, metaA] = entries[i];
        const [idB, metaB] = entries[j];

        if (!metaA.position || !metaB.position) continue;

        const boxA = createBox(metaA.position.x, metaA.position.y, config);
        const boxB = createBox(metaB.position.x, metaB.position.y, config);

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
