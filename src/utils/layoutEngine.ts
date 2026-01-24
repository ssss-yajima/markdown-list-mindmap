import type { ListItem } from '../types/markdown'
import type { NodeMetadata, LayoutDirection } from '../types/mindMap'

interface LayoutConfig {
  nodeWidth: number
  nodeHeight: number
  horizontalGap: number
  verticalGap: number
  minVerticalGap: number
}

const DEFAULT_CONFIG: LayoutConfig = {
  nodeWidth: 250, // CSSのmax-widthに合わせる
  nodeHeight: 40,
  horizontalGap: 30,
  verticalGap: 4,
  minVerticalGap: 4,
}

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
  const effectiveWidth = config.nodeWidth - 100

  // 文字幅を推定（日本語は14px、英数字は8px）
  let totalWidth = 0
  for (const char of text) {
    // 日本語・全角文字の判定（CJK統合漢字、ひらがな、カタカナ、全角記号など）
    if (/[\u3000-\u9FFF\uFF00-\uFFEF]/.test(char)) {
      totalWidth += 14
    } else {
      totalWidth += 8
    }
  }

  const lines = Math.ceil(totalWidth / effectiveWidth)
  const lineHeight = 24 // px (実際のCSSレンダリングに合わせて調整)
  const paddingY = 16 // 上下パディング
  return Math.max(config.nodeHeight, lines * lineHeight + paddingY)
}

/**
 * ListItemツリーからIDとテキストのマップを作成
 */
export function buildContentMapFromItems(
  items: ListItem[],
): Record<string, string> {
  const result: Record<string, string> = {}

  function traverse(list: ListItem[]): void {
    for (const item of list) {
      result[item.id] = item.text
      if (item.children.length > 0) {
        traverse(item.children)
      }
    }
  }

  traverse(items)
  return result
}

interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

/**
 * 2つのバウンディングボックスが重なっているかチェック
 */
function boxesOverlap(a: BoundingBox, b: BoundingBox, margin = 0): boolean {
  return !(
    a.x + a.width + margin < b.x ||
    b.x + b.width + margin < a.x ||
    a.y + a.height + margin < b.y ||
    b.y + b.height + margin < a.y
  )
}

/**
 * ノードの位置からバウンディングボックスを作成
 */
function createBox(
  x: number,
  y: number,
  config: LayoutConfig,
  height?: number,
): BoundingBox {
  return {
    x,
    y,
    width: config.nodeWidth,
    height: height ?? config.nodeHeight,
  }
}

/**
 * X座標を計算（方向対応）
 */
function calculateX(
  depth: number,
  direction: LayoutDirection,
  config: LayoutConfig,
): number {
  if (depth === 0) {
    return 0
  }
  if (direction === 'right') {
    return depth * (config.nodeWidth + config.horizontalGap)
  }
  // left: 負の方向に展開
  return -depth * (config.nodeWidth + config.horizontalGap)
}

export function calculateLayout(
  items: ListItem[],
  existingMetadata: Record<string, NodeMetadata>,
  config: LayoutConfig = DEFAULT_CONFIG,
  directionOverrides?: Record<string, LayoutDirection>,
): Record<string, NodeMetadata> {
  const result: Record<string, NodeMetadata> = {}
  const placedBoxes: { id: string; box: BoundingBox }[] = []

  /**
   * サブツリーの高さを計算
   */
  function getSubtreeHeight(item: ListItem): number {
    const nodeHeight = estimateNodeHeight(item.text, config)
    if (item.children.length === 0) {
      return nodeHeight
    }
    const childrenHeight = item.children.reduce((sum, child) => {
      return sum + getSubtreeHeight(child) + config.verticalGap
    }, -config.verticalGap)
    return Math.max(nodeHeight, childrenHeight)
  }

  /**
   * 指定位置に重なりがないかチェックし、必要なら調整
   */
  function findNonOverlappingY(
    x: number,
    preferredY: number,
    nodeId: string,
    nodeHeight: number,
  ): number {
    const box = createBox(x, preferredY, config, nodeHeight)
    let adjustedY = preferredY
    let iterations = 0
    const maxIterations = 100

    while (iterations < maxIterations) {
      let hasOverlap = false

      for (const placed of placedBoxes) {
        if (placed.id === nodeId) continue

        const placedBox = placed.box
        if (boxesOverlap(box, placedBox, config.minVerticalGap)) {
          hasOverlap = true
          // 重なっている場合、下にずらす
          adjustedY = placedBox.y + placedBox.height + config.verticalGap
          box.y = adjustedY
          break
        }
      }

      if (!hasOverlap) break
      iterations++
    }

    return adjustedY
  }

  /**
   * サブツリーをレイアウト（方向対応）
   */
  function layoutSubtree(
    item: ListItem,
    depth: number,
    startY: number,
    direction: LayoutDirection,
  ): number {
    const x = calculateX(depth, direction, config)
    const nodeHeight = estimateNodeHeight(item.text, config)

    // 既存の位置があれば使用（ユーザーがドラッグした位置を保持）
    const existing = existingMetadata[item.id]
    if (existing?.position) {
      // directionを保持
      result[item.id] = {
        ...existing,
        direction: depth === 1 ? (existing.direction ?? direction) : undefined,
      }
      placedBoxes.push({
        id: item.id,
        box: createBox(
          existing.position.x,
          existing.position.y,
          config,
          nodeHeight,
        ),
      })

      // 子ノードの方向は親（レベル1）の方向を継承
      const childDirection = depth >= 1 ? direction : 'right'
      let childY = startY
      for (const child of item.children) {
        // レベル1ノードの場合はdirectionOverridesまたは既存のdirectionを取得
        const existingChildDirection =
          depth === 0
            ? (directionOverrides?.[child.id] ?? existingMetadata[child.id]?.direction)
            : undefined
        const childHeight = layoutSubtree(
          child,
          depth + 1,
          childY,
          existingChildDirection ?? childDirection,
        )
        childY += childHeight + config.verticalGap
      }
      return getSubtreeHeight(item)
    }

    if (item.children.length === 0) {
      const finalY = findNonOverlappingY(x, startY, item.id, nodeHeight)
      result[item.id] = {
        id: item.id,
        position: { x, y: finalY },
        expanded: true,
        direction: depth === 1 ? direction : undefined,
      }
      placedBoxes.push({
        id: item.id,
        box: createBox(x, finalY, config, nodeHeight),
      })
      return nodeHeight
    }

    // 子ノードを先にレイアウト
    let childY = startY
    const childPositions: number[] = []

    // 子ノードの方向は親（レベル1）の方向を継承
    const childDirection = depth >= 1 ? direction : 'right'
    for (const child of item.children) {
      childPositions.push(childY)
      // レベル1ノードの場合はdirectionOverridesまたは既存のdirectionを取得
      const existingChildDirection =
        depth === 0
          ? (directionOverrides?.[child.id] ?? existingMetadata[child.id]?.direction)
          : undefined
      const childHeight = layoutSubtree(
        child,
        depth + 1,
        childY,
        existingChildDirection ?? childDirection,
      )
      childY += childHeight + config.verticalGap
    }

    // 親を子の中央に配置
    const firstChildMeta = result[item.children[0].id]
    const lastChildMeta = result[item.children[item.children.length - 1].id]

    const firstChildY = firstChildMeta?.position.y ?? childPositions[0]
    const lastChildY =
      lastChildMeta?.position.y ?? childPositions[childPositions.length - 1]
    const centerY = (firstChildY + lastChildY) / 2

    const finalY = findNonOverlappingY(x, centerY, item.id, nodeHeight)

    result[item.id] = {
      id: item.id,
      position: { x, y: finalY },
      expanded: true,
      direction: depth === 1 ? direction : undefined,
    }
    placedBoxes.push({
      id: item.id,
      box: createBox(x, finalY, config, nodeHeight),
    })

    return childY - startY - config.verticalGap
  }

  let currentY = 0

  for (const item of items) {
    const height = layoutSubtree(item, 0, currentY, 'right')
    currentY += height + config.verticalGap * 2
  }

  // 最終的な衝突解消パスを実行
  const contentMap = buildContentMapFromItems(items)
  const resolved = resolveOverlaps(result, contentMap, config)
  return resolved
}

/**
 * 重なりを検出して解消するレイアウト調整
 * ユーザーがノードをドラッグした後に呼び出される
 * 左側ノード（x < 0）と右側ノード（x >= 0）を分離して衝突解消
 */
export function resolveOverlaps(
  metadata: Record<string, NodeMetadata>,
  contentMap: Record<string, string> = {},
  config: LayoutConfig = DEFAULT_CONFIG,
): Record<string, NodeMetadata> {
  const result = { ...metadata }
  const entries = Object.entries(result)

  // 各ノードの高さを計算
  const heightMap: Record<string, number> = {}
  for (const [id] of entries) {
    const text = contentMap[id] ?? ''
    heightMap[id] = estimateNodeHeight(text, config)
  }

  // 左側と右側に分離
  const leftEntries = entries.filter(
    ([, meta]) => meta.position && meta.position.x < 0,
  )
  const rightEntries = entries.filter(
    ([, meta]) => meta.position && meta.position.x >= 0,
  )

  // 各サイドで衝突解消を実行
  const resolveOverlapsForSide = (
    sideEntries: [string, NodeMetadata][],
  ): void => {
    let hasChanges = true
    let iterations = 0
    const maxIterations = 50

    // 同一深度（X座標が近い）のノード間のみ衝突をチェック
    // 階層間隔（nodeWidth + horizontalGap）に合わせて設定
    const xTolerance = config.nodeWidth + config.horizontalGap

    while (hasChanges && iterations < maxIterations) {
      hasChanges = false

      for (let i = 0; i < sideEntries.length; i++) {
        for (let j = i + 1; j < sideEntries.length; j++) {
          const [idA, metaA] = sideEntries[i]
          const [idB, metaB] = sideEntries[j]

          if (!metaA.position || !metaB.position) continue

          // 同一階層のノードのみ衝突チェック
          const sameDepth =
            Math.abs(metaA.position.x - metaB.position.x) < xTolerance
          if (!sameDepth) continue

          const heightA = heightMap[idA]
          const heightB = heightMap[idB]
          const boxA = createBox(
            metaA.position.x,
            metaA.position.y,
            config,
            heightA,
          )
          const boxB = createBox(
            metaB.position.x,
            metaB.position.y,
            config,
            heightB,
          )

          if (boxesOverlap(boxA, boxB, config.minVerticalGap)) {
            // 重なりを解消 - 下にあるノードを下に移動
            if (boxA.y <= boxB.y) {
              const newY = boxA.y + boxA.height + config.verticalGap
              result[idB] = {
                ...metaB,
                position: { ...metaB.position, y: newY },
              }
              sideEntries[j] = [idB, result[idB]]
            } else {
              const newY = boxB.y + boxB.height + config.verticalGap
              result[idA] = {
                ...metaA,
                position: { ...metaA.position, y: newY },
              }
              sideEntries[i] = [idA, result[idA]]
            }
            hasChanges = true
          }
        }
      }

      iterations++
    }
  }

  resolveOverlapsForSide(leftEntries)
  resolveOverlapsForSide(rightEntries)

  return result
}

/**
 * 指定ノードのサブツリーを新しい方向で再レイアウト
 */
export function relayoutSubtree(
  nodeId: string,
  newDirection: LayoutDirection,
  items: ListItem[],
  existingMetadata: Record<string, NodeMetadata>,
  config: LayoutConfig = DEFAULT_CONFIG,
): Record<string, NodeMetadata> {
  const result = { ...existingMetadata }

  /**
   * ノードとその子孫のIDを収集
   */
  function collectSubtreeIds(item: ListItem): string[] {
    const ids = [item.id]
    for (const child of item.children) {
      ids.push(...collectSubtreeIds(child))
    }
    return ids
  }

  /**
   * itemsからnodeIdを持つListItemを探す
   */
  function findItem(list: ListItem[], targetId: string): ListItem | null {
    for (const item of list) {
      if (item.id === targetId) return item
      const found = findItem(item.children, targetId)
      if (found) return found
    }
    return null
  }

  const targetItem = findItem(items, nodeId)
  if (!targetItem) return result

  // サブツリーのIDを収集
  const subtreeIds = collectSubtreeIds(targetItem)

  // サブツリーの全ノードの既存位置をクリア（レベル1ノード含む、位置は再計算）
  for (const id of subtreeIds) {
    delete result[id]
  }

  // directionOverridesで新しい方向を渡して全体を再レイアウト
  return calculateLayout(items, result, config, { [nodeId]: newDirection })
}
