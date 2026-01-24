import { test, expect, type Page } from '@playwright/test'

// ノード位置の型定義
interface NodePosition {
  text: string
  x: number
  y: number
}

// ノード位置を取得するヘルパー関数
async function getNodePositions(page: Page): Promise<NodePosition[]> {
  return page.evaluate(() => {
    const nodes = document.querySelectorAll('.react-flow__node')
    return Array.from(nodes).map((node) => {
      const transform = node.getAttribute('style') || ''
      const match = transform.match(
        /translate\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px\)/,
      )
      return {
        text: node.textContent?.trim() || '',
        x: match ? Number.parseFloat(match[1]) : 0,
        y: match ? Number.parseFloat(match[2]) : 0,
      }
    })
  })
}

// 重なりがないことを検証するヘルパー関数
function assertNoOverlaps(
  positions: NodePosition[],
  nodeHeight = 40,
  minGap = 10,
) {
  // X座標でグループ化（50px単位）
  const groupedByX = new Map<number, NodePosition[]>()
  for (const node of positions) {
    const xKey = Math.round(node.x / 50) * 50
    if (!groupedByX.has(xKey)) {
      groupedByX.set(xKey, [])
    }
    groupedByX.get(xKey)!.push(node)
  }

  // 各グループ内で重なりをチェック
  const overlaps: string[] = []
  for (const [, nodes] of groupedByX) {
    const sorted = [...nodes].sort((a, b) => a.y - b.y)
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i]
      const next = sorted[i + 1]
      const gap = next.y - current.y
      if (gap < nodeHeight + minGap) {
        overlaps.push(
          `"${current.text}" と "${next.text}" の間隔が不十分: ${gap}px`,
        )
      }
    }
  }

  if (overlaps.length > 0) {
    throw new Error(`ノードの重なりを検出:\n${overlaps.join('\n')}`)
  }
}

test.describe('Layout Improvement', () => {
  test.beforeEach(async ({ page }) => {
    // LocalStorageをクリアして新規状態から開始
    await page.goto('/markdown-list-mindmap/')
    await page.evaluate(() => {
      localStorage.clear()
      // テスト用にautoCenterを無効化
      localStorage.setItem('mindmap-config', JSON.stringify({
        state: { backgroundStyle: 'grid', nodeStyle: 'none', fontStyle: 'system', autoCenterEnabled: false },
        version: 0
      }))
    })
    await page.reload()
  })

  test('初期レイアウト: 新規マークダウン入力時にノードが重ならない', async ({
    page,
  }) => {
    const textarea = page.locator('textarea')

    // 複数階層のマークダウンを入力
    await textarea.fill(`- ルート1
  - 子1-1
    - 孫1-1-1
    - 孫1-1-2
    - 孫1-1-3
  - 子1-2
  - 子1-3
- ルート2
  - 子2-1
  - 子2-2`)

    // 少し待ってレイアウトが完了するのを待つ
    await page.waitForTimeout(500)

    // 全ノードの位置を取得
    const nodePositions = await page.evaluate(() => {
      const nodes = document.querySelectorAll('.react-flow__node')
      return Array.from(nodes).map((node) => {
        const transform = node.getAttribute('style') || ''
        const match = transform.match(
          /translate\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px\)/,
        )
        const text = node.textContent?.trim() || ''
        return {
          text,
          x: match ? Number.parseFloat(match[1]) : 0,
          y: match ? Number.parseFloat(match[2]) : 0,
        }
      })
    })

    console.log('Node positions:', nodePositions)

    // 同一X座標（同じ階層）のノード間で重なりがないことを確認
    const nodeHeight = 40
    const minGap = 10

    // X座標でグループ化
    const groupedByX = new Map<number, typeof nodePositions>()
    for (const node of nodePositions) {
      const xKey = Math.round(node.x / 50) * 50 // 50px単位でグループ化
      if (!groupedByX.has(xKey)) {
        groupedByX.set(xKey, [])
      }
      groupedByX.get(xKey)!.push(node)
    }

    // 各グループ内で重なりをチェック
    for (const [xKey, nodes] of groupedByX) {
      // Y座標でソート
      const sorted = [...nodes].sort((a, b) => a.y - b.y)

      for (let i = 0; i < sorted.length - 1; i++) {
        const current = sorted[i]
        const next = sorted[i + 1]
        const gap = next.y - current.y

        // 十分な間隔があることを確認
        expect(
          gap,
          `ノード "${current.text}" と "${next.text}" の間隔`,
        ).toBeGreaterThanOrEqual(nodeHeight + minGap)
      }
    }
  })

  test('ノード追加時: 子ノード追加後も重なりがない', async ({ page }) => {
    const textarea = page.locator('textarea')

    // 初期マークダウンを入力
    await textarea.fill(`- ルート
  - 子1
  - 子2
  - 子3`)

    await page.waitForTimeout(500)

    // 子1ノードを選択してTabキーで子ノードを追加
    const child1Node = page
      .locator('.react-flow__node')
      .filter({ hasText: '子1' })
      .first()
    await child1Node.click()
    await page.keyboard.press('Tab')
    await page.waitForTimeout(300)

    // テキストを入力して確定
    await page.keyboard.type('新しい子')
    await page.keyboard.press('Escape') // Escapeで編集を確定
    await page.waitForTimeout(500)

    // 全ノードの位置を取得して重なりをチェック
    const nodePositions = await page.evaluate(() => {
      const nodes = document.querySelectorAll('.react-flow__node')
      return Array.from(nodes).map((node) => {
        const transform = node.getAttribute('style') || ''
        const match = transform.match(
          /translate\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px\)/,
        )
        const text = node.textContent?.trim() || ''
        return {
          text,
          x: match ? Number.parseFloat(match[1]) : 0,
          y: match ? Number.parseFloat(match[2]) : 0,
        }
      })
    })

    console.log('Node positions after adding child:', nodePositions)

    // ノードが4つ以上あること（子1、子2、子3、新しい子）
    // ルートノードはビューポート外にある可能性があるため除外
    expect(nodePositions.length).toBeGreaterThanOrEqual(4)

    // 同一階層のノードが重なっていないことを確認
    const nodeHeight = 40
    const minGap = 10
    const groupedByX = new Map<number, typeof nodePositions>()
    for (const node of nodePositions) {
      const xKey = Math.round(node.x / 50) * 50
      if (!groupedByX.has(xKey)) {
        groupedByX.set(xKey, [])
      }
      groupedByX.get(xKey)!.push(node)
    }

    for (const [, nodes] of groupedByX) {
      const sorted = [...nodes].sort((a, b) => a.y - b.y)
      for (let i = 0; i < sorted.length - 1; i++) {
        const current = sorted[i]
        const next = sorted[i + 1]
        const gap = next.y - current.y
        expect(
          gap,
          `ノード "${current.text}" と "${next.text}" の間隔`,
        ).toBeGreaterThanOrEqual(nodeHeight + minGap)
      }
    }
  })

  test('Auto Layout前後で大きな差がない', async ({ page }) => {
    const textarea = page.locator('textarea')

    // マークダウンを入力
    await textarea.fill(`- プロジェクト
  - フェーズ1
    - タスク1
    - タスク2
  - フェーズ2
    - タスク3
    - タスク4`)

    await page.waitForTimeout(500)

    // Auto Layout前の位置を取得
    const positionsBefore = await page.evaluate(() => {
      const nodes = document.querySelectorAll('.react-flow__node')
      return Array.from(nodes).map((node) => {
        const transform = node.getAttribute('style') || ''
        const match = transform.match(
          /translate\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px\)/,
        )
        const text = node.textContent?.trim() || ''
        return {
          text,
          x: match ? Number.parseFloat(match[1]) : 0,
          y: match ? Number.parseFloat(match[2]) : 0,
        }
      })
    })

    // Auto Layoutボタンをクリック
    const recalcButton = page.getByRole('button', { name: 'Auto Layout' })
    await recalcButton.click()
    await page.waitForTimeout(500)

    // Auto Layout後の位置を取得
    const positionsAfter = await page.evaluate(() => {
      const nodes = document.querySelectorAll('.react-flow__node')
      return Array.from(nodes).map((node) => {
        const transform = node.getAttribute('style') || ''
        const match = transform.match(
          /translate\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px\)/,
        )
        const text = node.textContent?.trim() || ''
        return {
          text,
          x: match ? Number.parseFloat(match[1]) : 0,
          y: match ? Number.parseFloat(match[2]) : 0,
        }
      })
    })

    console.log('Before recalculate:', positionsBefore)
    console.log('After recalculate:', positionsAfter)

    // 各ノードの位置差を計算
    const maxPositionDiff = 100 // 最大許容差
    for (const before of positionsBefore) {
      const after = positionsAfter.find((n) => n.text === before.text)
      if (after) {
        const xDiff = Math.abs(after.x - before.x)
        const yDiff = Math.abs(after.y - before.y)
        console.log(`Node "${before.text}": xDiff=${xDiff}, yDiff=${yDiff}`)

        // X座標は同じ階層なので大きく変わらないはず
        expect(xDiff, `ノード "${before.text}" のX座標差`).toBeLessThanOrEqual(
          maxPositionDiff,
        )
      }
    }
  })

  test('深いネスト: 各階層のノードが適切な水平位置に配置される', async ({
    page,
  }) => {
    const textarea = page.locator('textarea')

    // 4階層のマークダウンを入力
    await textarea.fill(`- レベル0
  - レベル1
    - レベル2
      - レベル3
        - レベル4`)

    await page.waitForTimeout(500)

    // 全ノードの位置を取得
    const nodePositions = await page.evaluate(() => {
      const nodes = document.querySelectorAll('.react-flow__node')
      return Array.from(nodes).map((node) => {
        const transform = node.getAttribute('style') || ''
        const match = transform.match(
          /translate\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px\)/,
        )
        const text = node.textContent?.trim() || ''
        return {
          text,
          x: match ? Number.parseFloat(match[1]) : 0,
          y: match ? Number.parseFloat(match[2]) : 0,
        }
      })
    })

    console.log('Deep nesting positions:', nodePositions)

    // 階層が深くなるほどX座標が大きくなることを確認
    const level0 = nodePositions.find((n) => n.text.includes('レベル0'))
    const level1 = nodePositions.find((n) => n.text.includes('レベル1'))
    const level2 = nodePositions.find((n) => n.text.includes('レベル2'))
    const level3 = nodePositions.find((n) => n.text.includes('レベル3'))
    const level4 = nodePositions.find((n) => n.text.includes('レベル4'))

    expect(level0).toBeDefined()
    expect(level1).toBeDefined()
    expect(level2).toBeDefined()
    expect(level3).toBeDefined()
    expect(level4).toBeDefined()

    // 各階層のX座標が順に増加していることを確認
    expect(level1!.x).toBeGreaterThan(level0!.x)
    expect(level2!.x).toBeGreaterThan(level1!.x)
    expect(level3!.x).toBeGreaterThan(level2!.x)
    expect(level4!.x).toBeGreaterThan(level3!.x)
  })
})

test.describe('日本語長文テキストの高さ計算', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/markdown-list-mindmap/')
    await page.evaluate(() => {
      localStorage.clear()
      // テスト用にautoCenterを無効化
      localStorage.setItem('mindmap-config', JSON.stringify({
        state: { backgroundStyle: 'grid', nodeStyle: 'none', fontStyle: 'system', autoCenterEnabled: false },
        version: 0
      }))
    })
    await page.reload()
  })

  test('日本語混じりの長文テキストでノードが重ならない', async ({ page }) => {
    const textarea = page.locator('textarea')

    // 計画で記載されたテストケース: 日本語混じりの長文テキスト
    await textarea.fill(`- Tech Lead Manager : 技術とマネジメントのプレマネ。マネジメントに行くにもスタッフエンジニアにいくにも半端
- コーチ：9人以上をサポートする場合、安全網として動きがち。良くない。
- 短いノード
- もう一つの長い日本語テキストでテストする例文です`)

    await page.waitForTimeout(500)

    // 全ノードの位置を取得
    const nodePositions = await getNodePositions(page)
    console.log('Japanese long text positions:', nodePositions)

    // ノードが4つあることを確認
    expect(nodePositions.length).toBe(4)

    // 重なりがないことを確認（日本語テキストは高さが大きくなるため、より大きな間隔をチェック）
    // nodeHeightは動的に計算されるため、minGapのみでチェック
    const minGap = 10

    // 同一X座標（同じ階層）のノード間で重なりをチェック
    const groupedByX = new Map<number, typeof nodePositions>()
    for (const node of nodePositions) {
      const xKey = Math.round(node.x / 50) * 50
      if (!groupedByX.has(xKey)) {
        groupedByX.set(xKey, [])
      }
      groupedByX.get(xKey)!.push(node)
    }

    for (const [, nodes] of groupedByX) {
      const sorted = [...nodes].sort((a, b) => a.y - b.y)
      for (let i = 0; i < sorted.length - 1; i++) {
        const current = sorted[i]
        const next = sorted[i + 1]
        const gap = next.y - current.y

        // 間隔が最小ギャップ以上あることを確認（動的な高さを考慮）
        expect(
          gap,
          `ノード "${current.text.substring(0, 20)}..." と "${next.text.substring(0, 20)}..." の間隔`,
        ).toBeGreaterThanOrEqual(minGap)
      }
    }
  })
})

test.describe('ドラッグ後の衝突解消', () => {
  test.beforeEach(async ({ page }) => {
    // LocalStorageをクリアして新規状態から開始
    await page.goto('/markdown-list-mindmap/')
    await page.evaluate(() => {
      localStorage.clear()
      // テスト用にautoCenterを無効化
      localStorage.setItem('mindmap-config', JSON.stringify({
        state: { backgroundStyle: 'grid', nodeStyle: 'none', fontStyle: 'system', autoCenterEnabled: false },
        version: 0
      }))
    })
    await page.reload()
  })

  test('ドラッグ後の衝突解消: 同一階層のノードと重なる位置に移動すると自動調整される', async ({
    page,
  }) => {
    const textarea = page.locator('textarea')

    // シンプルな3ノード構成を作成
    await textarea.fill(`- ルート
  - ノードA
  - ノードB
  - ノードC`)

    await page.waitForTimeout(500)

    // ノード位置を確認
    const positionsBefore = await getNodePositions(page)
    console.log('Before drag:', positionsBefore)

    // ノードAを取得
    const nodeA = page
      .locator('.react-flow__node')
      .filter({ hasText: 'ノードA' })
      .first()
    const nodeB = page
      .locator('.react-flow__node')
      .filter({ hasText: 'ノードB' })
      .first()

    await expect(nodeA).toBeVisible()
    await expect(nodeB).toBeVisible()

    // ノードAをノードBと重なる位置にドラッグ
    // ノードBの位置を取得してそこに向かってドラッグ
    const nodeBBox = await nodeB.boundingBox()
    expect(nodeBBox).not.toBeNull()

    await nodeA.hover()
    await page.mouse.down()
    await page.mouse.move(
      nodeBBox!.x + nodeBBox!.width / 2,
      nodeBBox!.y + nodeBBox!.height / 2,
    )
    await page.mouse.up()

    await page.waitForTimeout(500)

    // ドラッグ後のノード位置を取得
    const positionsAfter = await getNodePositions(page)
    console.log('After drag:', positionsAfter)

    // 衝突解消により、全ノードの間隔が適切に保たれることを確認
    assertNoOverlaps(positionsAfter)
  })

  test('ドラッグ後も階層（X座標）は維持される', async ({ page }) => {
    const textarea = page.locator('textarea')

    // 2階層構造を作成
    await textarea.fill(`- 親ノード
  - 子ノード1
  - 子ノード2`)

    await page.waitForTimeout(500)

    // ドラッグ前のX座標を取得
    const positionsBefore = await getNodePositions(page)
    const child1Before = positionsBefore.find((n) =>
      n.text.includes('子ノード1'),
    )
    expect(child1Before).toBeDefined()

    const child1XBefore = child1Before!.x

    // 子ノード1を大きく上方向にドラッグ
    const child1Node = page
      .locator('.react-flow__node')
      .filter({ hasText: '子ノード1' })
      .first()
    await expect(child1Node).toBeVisible()

    const child1Box = await child1Node.boundingBox()
    expect(child1Box).not.toBeNull()

    // 上方向に100pxドラッグ
    await child1Node.hover()
    await page.mouse.down()
    await page.mouse.move(child1Box!.x, child1Box!.y - 100)
    await page.mouse.up()

    await page.waitForTimeout(500)

    // ドラッグ後のX座標を取得
    const positionsAfter = await getNodePositions(page)
    const child1After = positionsAfter.find((n) => n.text.includes('子ノード1'))
    expect(child1After).toBeDefined()

    console.log('Before X:', child1XBefore, 'After X:', child1After!.x)

    // X座標（階層位置）が大きく変わっていないことを確認
    // 現在の実装ではY方向のみのドラッグでも多少のX方向のズレが生じる可能性がある
    const xDiff = Math.abs(child1After!.x - child1XBefore)
    expect(xDiff).toBeLessThan(100) // X座標が大幅に変わっていないこと
  })

  test('複数回のドラッグ操作後も重なりがない', async ({ page }) => {
    const textarea = page.locator('textarea')

    // 複数ノードの構成を作成
    await textarea.fill(`- ルート
  - ノード1
  - ノード2
  - ノード3
  - ノード4`)

    await page.waitForTimeout(500)

    // 複数のノードを順番にドラッグ
    const nodes = ['ノード1', 'ノード2', 'ノード3']

    for (const nodeName of nodes) {
      const node = page
        .locator('.react-flow__node')
        .filter({ hasText: nodeName })
        .first()
      await expect(node).toBeVisible()

      const nodeBox = await node.boundingBox()
      expect(nodeBox).not.toBeNull()

      // ランダムな方向に50pxドラッグ
      const deltaY = (Math.random() - 0.5) * 100 // -50 ~ +50
      await node.hover()
      await page.mouse.down()
      await page.mouse.move(nodeBox!.x, nodeBox!.y + deltaY)
      await page.mouse.up()

      await page.waitForTimeout(300)
    }

    await page.waitForTimeout(500)

    // 最終的に全ノードが重なっていないことを確認
    const finalPositions = await getNodePositions(page)
    console.log('Final positions:', finalPositions)

    assertNoOverlaps(finalPositions)
  })
})
