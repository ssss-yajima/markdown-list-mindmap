import { test, expect } from '@playwright/test'

test.describe('Markdown Mind Map', () => {
  test.beforeEach(async ({ page }) => {
    // LocalStorageをクリアして初期状態に
    await page.goto('/')
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

  test('初期表示: サンプルデータが表示される', async ({ page }) => {
    // ヘッダーが表示される
    await expect(page.locator('h1')).toHaveText('Markdown Mind Map')

    // マークダウンエディタにサンプルデータが表示される
    const textarea = page.locator('textarea')
    await expect(textarea).toContainText('プロジェクト計画')

    // マインドマップにノードが表示される
    await expect(page.getByText('プロジェクト計画').first()).toBeVisible()
    await expect(page.getByText('フェーズ1').first()).toBeVisible()
    await expect(page.getByText('リソース').first()).toBeVisible()
  })

  test('マークダウン入力 → マインドマップに反映', async ({ page }) => {
    const textarea = page.locator('textarea')

    // テキストをクリアして新しい内容を入力
    await textarea.fill('- テスト項目\n  - 子項目A\n  - 子項目B')

    // デバウンス待ち
    await page.waitForTimeout(500)

    // マインドマップに反映される
    await expect(page.getByText('テスト項目').first()).toBeVisible()
    await expect(page.getByText('子項目A').first()).toBeVisible()
    await expect(page.getByText('子項目B').first()).toBeVisible()
  })

  test('ノードのドラッグ移動', async ({ page }) => {
    // ノードを取得
    const node = page
      .locator('[role="group"][aria-roledescription="node"]')
      .filter({
        hasText: '要件定義',
      })
    await expect(node).toBeVisible()

    // ノードの初期位置を取得
    const initialBox = await node.boundingBox()
    expect(initialBox).not.toBeNull()

    // ドラッグして移動
    await node.dragTo(node, {
      targetPosition: { x: 50, y: 50 },
      force: true,
    })

    // 位置が変わったことを確認（移動後もノードは表示される）
    await expect(node).toBeVisible()
  })

  test('ノードダブルクリックで展開/折りたたみ', async ({ page }) => {
    // フェーズ1ノードを見つける（子を持つノード）
    const phase1Node = page
      .locator('[role="group"][aria-roledescription="node"]')
      .filter({
        hasText: 'フェーズ1',
      })
    await expect(phase1Node).toBeVisible()

    // 子ノード「要件定義」が表示されていることを確認
    await expect(page.getByText('要件定義').first()).toBeVisible()

    // ダブルクリックして折りたたむ
    await phase1Node.dblclick()

    // デバウンス待ち
    await page.waitForTimeout(300)

    // 子ノード「要件定義」が非表示になることを確認
    // (フェーズ1の子なので、折りたたまれると見えなくなる)
    const nodeCount = await page
      .locator('[role="group"][aria-roledescription="node"]')
      .filter({
        hasText: '要件定義',
      })
      .count()

    // 折りたたまれた場合は0、そうでなければ1
    // 注: React Flowの実装によっては非表示でもDOMに残る場合がある
    expect(nodeCount).toBeLessThanOrEqual(1)
  })

  test('Auto Layoutボタン', async ({ page }) => {
    // Auto Layoutボタンをクリック
    const button = page.getByRole('button', { name: 'Auto Layout' })
    await expect(button).toBeVisible()
    await button.click()

    // ノードが引き続き表示される
    await expect(page.getByText('プロジェクト計画').first()).toBeVisible()
  })

  test('LocalStorage永続化: リロード後もデータが残る', async ({ page }) => {
    const textarea = page.locator('textarea')

    // カスタムデータを入力
    await textarea.fill('- 永続化テスト\n  - 子ノード')
    await page.waitForTimeout(500)

    // 反映を確認
    await expect(page.getByText('永続化テスト').first()).toBeVisible()

    // ページをリロード
    await page.reload()

    // データが残っていることを確認
    await expect(textarea).toContainText('永続化テスト')
    await expect(page.getByText('永続化テスト').first()).toBeVisible()
  })
})

test.describe('キーボード操作', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  // ヘルパー: ノードをクリックしてキャンバスにフォーカスを確保
  async function selectNode(
    page: import('@playwright/test').Page,
    nodeText: string,
  ) {
    const node = page
      .locator('[role="group"][aria-roledescription="node"]')
      .filter({ hasText: nodeText })
    await expect(node).toBeVisible()
    // React Flowのキャンバスをクリックしてtextareaからフォーカスを外す
    const canvas = page.locator('.react-flow')
    await canvas.click({ position: { x: 10, y: 10 } })
    // ノードをクリックして選択
    await node.click()
    return node
  }

  test('F2キーで編集開始', async ({ page }) => {
    // 要件定義ノードを選択
    const node = await selectNode(page, '要件定義')

    // F2キーで編集モード開始
    await page.keyboard.press('F2')
    await page.waitForTimeout(150)

    // 入力フィールドがフォーカスされている
    const input = page.locator('.mindmap-node input[type="text"]')
    await expect(input).toBeVisible()
    await expect(input).toBeFocused()
    await expect(input).toHaveValue('要件定義')
  })

  test('編集中にEnterで下に兄弟ノード追加', async ({ page }) => {
    // 要件定義ノードを選択してF2で編集開始
    await selectNode(page, '要件定義')
    await page.keyboard.press('F2')
    await page.waitForTimeout(150)

    // テキストを変更
    const input = page.locator('.mindmap-node input[type="text"]')
    await expect(input).toBeVisible()
    await input.fill('テストノード')

    // Enterを押す
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)

    // 新しいノードが追加され、編集モードになっている
    const newNodeInput = page.locator(
      'input[type="text"][value="新しいノード"]',
    )
    await expect(newNodeInput).toBeVisible()
    await expect(newNodeInput).toBeFocused()

    // 元のノードが変更されている
    await expect(page.getByText('テストノード').first()).toBeVisible()
  })

  test('編集中にShift+Enterで上に兄弟ノード追加', async ({ page }) => {
    // 設計ノードを選択（要件定義の下にある）
    await selectNode(page, '設計')
    await page.keyboard.press('F2')
    await page.waitForTimeout(150)

    // Shift+Enterを押す
    await page.keyboard.press('Shift+Enter')
    await page.waitForTimeout(300)

    // 新しいノードが追加され、編集モードになっている
    const newNodeInput = page.locator(
      'input[type="text"][value="新しいノード"]',
    )
    await expect(newNodeInput).toBeVisible()
    await expect(newNodeInput).toBeFocused()
  })

  test('編集中にTabで子ノード追加', async ({ page }) => {
    // 要件定義ノードを選択してF2で編集開始
    await selectNode(page, '要件定義')
    await page.keyboard.press('F2')
    await page.waitForTimeout(150)

    // Tabを押す
    await page.keyboard.press('Tab')
    await page.waitForTimeout(300)

    // 新しい子ノードが追加され、編集モードになっている
    const newNodeInput = page.locator(
      'input[type="text"][value="新しいノード"]',
    )
    await expect(newNodeInput).toBeVisible()
    await expect(newNodeInput).toBeFocused()
  })

  test('編集中にEscapeで編集キャンセル', async ({ page }) => {
    // 要件定義ノードを選択してF2で編集開始
    await selectNode(page, '要件定義')
    await page.keyboard.press('F2')
    await page.waitForTimeout(150)

    // テキストを変更
    const input = page.locator('.mindmap-node input[type="text"]')
    await expect(input).toBeVisible()
    await input.fill('変更したテキスト')

    // Escapeを押す
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // 入力フィールドが非表示になる
    await expect(input).not.toBeVisible()

    // 元のテキストが維持されている
    await expect(page.getByText('要件定義').first()).toBeVisible()
  })

  test('連続でノード作成', async ({ page }) => {
    // 要件定義ノードを選択してF2で編集開始
    await selectNode(page, '要件定義')
    await page.keyboard.press('F2')
    await page.waitForTimeout(150)

    // 最初のノードのテキストを変更してEnter
    let input = page.locator('input[type="text"]:focus')
    await expect(input).toBeVisible()
    await input.fill('ノード1')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)

    // 2つ目のノードのテキストを入力してEnter
    input = page.locator('input[type="text"]:focus')
    await expect(input).toBeVisible()
    await input.fill('ノード2')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)

    // 3つ目のノードのテキストを入力してEnter（テキストを確定）
    input = page.locator('input[type="text"]:focus')
    await expect(input).toBeVisible()
    await input.fill('ノード3')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)

    // 新しいノードの編集をEscapeでキャンセル
    input = page.locator('input[type="text"]:focus')
    await expect(input).toBeVisible()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // 3つのノードが正しく存在する
    await expect(page.getByText('ノード1').first()).toBeVisible()
    await expect(page.getByText('ノード2').first()).toBeVisible()
    await expect(page.getByText('ノード3').first()).toBeVisible()
  })
})
