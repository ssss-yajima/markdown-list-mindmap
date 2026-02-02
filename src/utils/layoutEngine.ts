import type { ListItem } from '../types/markdown'
import type {
  NodeMetadata,
  LayoutDirection,
  LayoutConfig as UserLayoutConfig,
} from '../types/mindMap'

export interface FullLayoutConfig {
  nodeWidth: number
  nodeHeight: number
  horizontalGap: number
  verticalGap: number
  minVerticalGap: number
}

const DEFAULT_CONFIG: FullLayoutConfig = {
  nodeWidth: 250, // CSSのmax-widthに合わせる（フォールバック用）
  nodeHeight: 40,
  horizontalGap: 10,
  verticalGap: 4,
  minVerticalGap: 4,
}

export const DEFAULT_LAYOUT_CONFIG: UserLayoutConfig = {
  horizontalGap: DEFAULT_CONFIG.horizontalGap,
}

/**
 * ユーザー設定を内部設定にマージする
 */
export function mergeLayoutConfig(
  partial?: Partial<UserLayoutConfig>,
): FullLayoutConfig {
  return {
    ...DEFAULT_CONFIG,
    horizontalGap: partial?.horizontalGap ?? DEFAULT_CONFIG.horizontalGap,
  }
}

// ノード幅の定数
const MIN_NODE_WIDTH = 120 // CSSのmin-widthに合わせる
const MAX_NODE_WIDTH = 250 // CSSのmax-widthに合わせる
const HORIZONTAL_PADDING = 24 // 左右パディング: 12px × 2
const BUTTON_SPACE = 52 // add-child-button(20px) + expand-button(20px) + gaps(6px × 2)
const BUTTON_SPACE_NO_CHILDREN = 26 // add-child-buttonのみ
// 文字幅の推定値（保守的に大きめに設定）
// level-0: font-size 16px, font-weight 600 を考慮
const CJK_CHAR_WIDTH = 18 // 日本語文字の推定幅
const ASCII_CHAR_WIDTH = 10 // 英数字の推定幅
const LAYOUT_MARGIN = 8 // レイアウト用の安全マージン

const CJK_FULLWIDTH_REGEX = /[\u3000-\u9FFF\uFF00-\uFFEF]/

/**
 * テキスト長に基づいてノード幅を推定
 * 日本語と英数字で文字幅を区別して計算
 * 実際のCSS幅より大きめに見積もることでエッジの回り込みを防止
 */
function estimateNodeWidth(text: string, hasChildren: boolean): number {
  // 文字幅を推定（保守的に大きめの値を使用）
  let textWidth = 0
  for (const char of text) {
    if (CJK_FULLWIDTH_REGEX.test(char)) {
      textWidth += CJK_CHAR_WIDTH
    } else {
      textWidth += ASCII_CHAR_WIDTH
    }
  }

  const buttonSpace = hasChildren ? BUTTON_SPACE : BUTTON_SPACE_NO_CHILDREN
  const totalWidth = textWidth + HORIZONTAL_PADDING + buttonSpace + LAYOUT_MARGIN

  return Math.max(MIN_NODE_WIDTH, Math.min(MAX_NODE_WIDTH, totalWidth))
}

/**
 * ListItemツリーから各ノードの推定幅マップを作成
 */
function buildWidthMapFromItems(items: ListItem[]): Record<string, number> {
  const result: Record<string, number> = {}

  function traverse(list: ListItem[]): void {
    for (const item of list) {
      result[item.id] = estimateNodeWidth(item.text, item.children.length > 0)
      if (item.children.length > 0) {
        traverse(item.children)
      }
    }
  }

  traverse(items)
  return result
}

/**
 * テキスト長に基づいてノード高さを推定
 * 日本語と英数字で文字幅を区別して計算
 */
function estimateNodeHeight(text: string, config: FullLayoutConfig): number {
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
    if (CJK_FULLWIDTH_REGEX.test(char)) {
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
  width: number,
  height: number,
): BoundingBox {
  return {
    x,
    y,
    width,
    height,
  }
}

/**
 * Find the direction for a new L1 node by inheriting from siblings.
 * First searches previous siblings, then next siblings.
 */
function findSiblingDirection(
  siblings: ListItem[],
  currentIndex: number,
  directionOverrides: Record<string, LayoutDirection> | undefined,
  existingMetadata: Record<string, NodeMetadata>,
): LayoutDirection | undefined {
  // Search previous siblings first
  for (let j = currentIndex - 1; j >= 0; j--) {
    const siblingId = siblings[j].id
    const siblingDir =
      directionOverrides?.[siblingId] ?? existingMetadata[siblingId]?.direction
    if (siblingDir) {
      return siblingDir
    }
  }
  // Search next siblings
  for (let j = currentIndex + 1; j < siblings.length; j++) {
    const siblingId = siblings[j].id
    const siblingDir =
      directionOverrides?.[siblingId] ?? existingMetadata[siblingId]?.direction
    if (siblingDir) {
      return siblingDir
    }
  }
  return undefined
}

export function calculateLayout(
  items: ListItem[],
  existingMetadata: Record<string, NodeMetadata>,
  config: FullLayoutConfig = DEFAULT_CONFIG,
  directionOverrides?: Record<string, LayoutDirection>,
): Record<string, NodeMetadata> {
  const result: Record<string, NodeMetadata> = {}
  const placedBoxes: { id: string; box: BoundingBox }[] = []

  // 全ノードの幅を事前計算
  const widthMap = buildWidthMapFromItems(items)

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
    nodeWidth: number,
    nodeHeight: number,
  ): number {
    const box = createBox(x, preferredY, nodeWidth, nodeHeight)
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
   * parentX, parentWidth: 親ノードの位置と幅（動的幅計算用）
   */
  function layoutSubtree(
    item: ListItem,
    depth: number,
    startY: number,
    direction: LayoutDirection,
    parentX: number,
    parentWidth: number,
  ): number {
    const nodeWidth = widthMap[item.id] ?? config.nodeWidth
    const nodeHeight = estimateNodeHeight(item.text, config)
    const isRoot = depth === 0

    // X座標を計算
    let x: number
    if (isRoot) {
      x = 0
    } else if (direction === 'right') {
      x = parentX + parentWidth + config.horizontalGap
    } else {
      // left: 自分の右端が親の左端に接するように配置
      x = parentX - config.horizontalGap - nodeWidth
    }

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
          nodeWidth,
          nodeHeight,
        ),
      })

      // 子ノードの方向は親（レベル1）の方向を継承
      const childDirection = depth >= 1 ? direction : 'right'
      let childY = startY
      for (let i = 0; i < item.children.length; i++) {
        const child = item.children[i]
        // レベル1ノードの場合はdirectionOverridesまたは既存のdirectionを取得
        // 新規L1ノードの場合、兄弟の方向を継承
        const existingChildDirection =
          depth === 0
            ? (directionOverrides?.[child.id] ??
              existingMetadata[child.id]?.direction ??
              findSiblingDirection(
                item.children,
                i,
                directionOverrides,
                existingMetadata,
              ))
            : undefined
        const childHeight = layoutSubtree(
          child,
          depth + 1,
          childY,
          existingChildDirection ?? childDirection,
          existing.position.x,
          nodeWidth,
        )
        childY += childHeight + config.verticalGap
      }
      return getSubtreeHeight(item)
    }

    if (item.children.length === 0) {
      const finalY = findNonOverlappingY(x, startY, item.id, nodeWidth, nodeHeight)
      result[item.id] = {
        id: item.id,
        position: { x, y: finalY },
        expanded: true,
        direction: depth === 1 ? direction : undefined,
      }
      placedBoxes.push({
        id: item.id,
        box: createBox(x, finalY, nodeWidth, nodeHeight),
      })
      return nodeHeight
    }

    // 子ノードを先にレイアウト
    let childY = startY
    const childPositions: number[] = []

    // 子ノードの方向は親（レベル1）の方向を継承
    const childDirection = depth >= 1 ? direction : 'right'
    for (let i = 0; i < item.children.length; i++) {
      const child = item.children[i]
      childPositions.push(childY)
      // レベル1ノードの場合はdirectionOverridesまたは既存のdirectionを取得
      // 新規L1ノードの場合、兄弟の方向を継承
      const existingChildDirection =
        depth === 0
          ? (directionOverrides?.[child.id] ??
            existingMetadata[child.id]?.direction ??
            findSiblingDirection(
              item.children,
              i,
              directionOverrides,
              existingMetadata,
            ))
          : undefined
      const childHeight = layoutSubtree(
        child,
        depth + 1,
        childY,
        existingChildDirection ?? childDirection,
        x,
        nodeWidth,
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

    const finalY = findNonOverlappingY(x, centerY, item.id, nodeWidth, nodeHeight)

    result[item.id] = {
      id: item.id,
      position: { x, y: finalY },
      expanded: true,
      direction: depth === 1 ? direction : undefined,
    }
    placedBoxes.push({
      id: item.id,
      box: createBox(x, finalY, nodeWidth, nodeHeight),
    })

    return childY - startY - config.verticalGap
  }

  let currentY = 0

  for (const item of items) {
    const rootWidth = widthMap[item.id] ?? config.nodeWidth
    const height = layoutSubtree(item, 0, currentY, 'right', 0, rootWidth)
    currentY += height + config.verticalGap * 2
  }

  // 最終的な衝突解消パスを実行
  const contentMap = buildContentMapFromItems(items)
  const resolved = resolveOverlaps(result, contentMap, config, widthMap)
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
  config: FullLayoutConfig = DEFAULT_CONFIG,
  widthMap: Record<string, number> = {},
): Record<string, NodeMetadata> {
  const result = { ...metadata }
  const entries = Object.entries(result)

  // 各ノードの高さと幅を計算
  const heightMap: Record<string, number> = {}
  const effectiveWidthMap: Record<string, number> = {}
  for (const [id] of entries) {
    const text = contentMap[id] ?? ''
    heightMap[id] = estimateNodeHeight(text, config)
    // widthMapに値があればそれを使用、なければテキストから推定
    effectiveWidthMap[id] =
      widthMap[id] ?? estimateNodeWidth(text, false) // 子の有無は保守的にfalse
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

    while (hasChanges && iterations < maxIterations) {
      hasChanges = false

      for (let i = 0; i < sideEntries.length; i++) {
        for (let j = i + 1; j < sideEntries.length; j++) {
          const [idA, metaA] = sideEntries[i]
          const [idB, metaB] = sideEntries[j]

          if (!metaA.position || !metaB.position) continue

          const widthA = effectiveWidthMap[idA]
          const widthB = effectiveWidthMap[idB]
          const heightA = heightMap[idA]
          const heightB = heightMap[idB]

          // X座標範囲が重なっているかで同一深度を判定
          const aLeft = metaA.position.x
          const aRight = aLeft + widthA
          const bLeft = metaB.position.x
          const bRight = bLeft + widthB
          const xOverlap = !(aRight < bLeft || bRight < aLeft)
          if (!xOverlap) continue

          const boxA = createBox(
            metaA.position.x,
            metaA.position.y,
            widthA,
            heightA,
          )
          const boxB = createBox(
            metaB.position.x,
            metaB.position.y,
            widthB,
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
  config: FullLayoutConfig = DEFAULT_CONFIG,
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
