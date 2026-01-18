import type { ListItem } from '../types/markdown';
import type { NodeMetadata } from '../types/mindMap';

interface LayoutConfig {
  nodeWidth: number;
  nodeHeight: number;
  horizontalGap: number;
  verticalGap: number;
}

const DEFAULT_CONFIG: LayoutConfig = {
  nodeWidth: 180,
  nodeHeight: 40,
  horizontalGap: 80,
  verticalGap: 20,
};

export function calculateLayout(
  items: ListItem[],
  existingMetadata: Record<string, NodeMetadata>,
  config: LayoutConfig = DEFAULT_CONFIG
): Record<string, NodeMetadata> {
  const result: Record<string, NodeMetadata> = {};
  let currentY = 0;

  function getSubtreeHeight(item: ListItem): number {
    if (item.children.length === 0) {
      return config.nodeHeight;
    }
    const childrenHeight = item.children.reduce((sum, child) => {
      return sum + getSubtreeHeight(child) + config.verticalGap;
    }, -config.verticalGap);
    return Math.max(config.nodeHeight, childrenHeight);
  }

  function layoutSubtree(item: ListItem, depth: number, startY: number): number {
    const x = depth * (config.nodeWidth + config.horizontalGap);

    // 既存の位置があれば使用
    const existing = existingMetadata[item.id];
    if (existing?.position) {
      result[item.id] = existing;
      let childY = startY;
      item.children.forEach((child) => {
        const childHeight = layoutSubtree(child, depth + 1, childY);
        childY += childHeight + config.verticalGap;
      });
      return getSubtreeHeight(item);
    }

    if (item.children.length === 0) {
      result[item.id] = {
        id: item.id,
        position: { x, y: startY },
        expanded: true,
      };
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
    const firstChildY = childPositions[0];
    const lastChildY = childPositions[childPositions.length - 1];
    const centerY = (firstChildY + lastChildY) / 2;

    result[item.id] = {
      id: item.id,
      position: { x, y: centerY },
      expanded: true,
    };

    return childY - startY - config.verticalGap;
  }

  items.forEach((item) => {
    const height = layoutSubtree(item, 0, currentY);
    currentY += height + config.verticalGap * 2;
  });

  return result;
}
