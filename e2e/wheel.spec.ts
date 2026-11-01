import { expect, test, type Page } from '@playwright/test'

async function hl(page: Page, key: string) {
  return page.locator(`[data-testid="wheel"] g[data-key="${key}"]`).getAttribute('data-hl')
}

async function select(page: Page, key: string) {
  await page.locator(`[data-testid="wheel"] g[data-key="${key}"]`).click()
}

test('wheel opens in under 150 ms', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByTestId('wheel-button')).toBeVisible()
  const times: number[] = []
  for (let i = 0; i < 3; i++) {
    const ms = await page.evaluate(async () => {
      const t0 = performance.now()
      ;(document.querySelector('[data-testid="wheel-button"]') as HTMLButtonElement).click()
      while (!document.querySelector('[data-testid="wheel"] g[data-key="8A"]')) await new Promise((r) => requestAnimationFrame(r))
      await new Promise((r) => requestAnimationFrame(r))
      return performance.now() - t0
    })
    times.push(ms)
    await page.getByTestId('wheel-close').click()
    await expect(page.getByTestId('wheel')).toHaveCount(0)
  }
  console.log('wheel open ms', times.map(Math.round))
  expect(Math.min(...times)).toBeLessThan(150)
})

test('highlights: 8A, 12B and 1A (wrap)', async ({ page }) => {
  await page.goto('./')
  await page.getByTestId('wheel-button').click()

  await select(page, '8A')
  expect(await hl(page, '8A')).toBe('selected')
  for (const k of ['7A', '9A', '8B']) expect(await hl(page, k)).toBe('compatible')
  for (const k of ['10A', '3A']) expect(await hl(page, k)).toBe('boost')
  for (const k of ['5A', '9B', '2B', '12A']) expect(await hl(page, k)).toBe('dim')

  await select(page, '12B')
  expect(await hl(page, '12B')).toBe('selected')
  for (const k of ['11B', '1B', '12A']) expect(await hl(page, k)).toBe('compatible')
  for (const k of ['2B', '7B']) expect(await hl(page, k)).toBe('boost')
  expect(await hl(page, '10B')).toBe('dim')

  await select(page, '1A')
  expect(await hl(page, '1A')).toBe('selected')
  for (const k of ['12A', '2A', '1B']) expect(await hl(page, k)).toBe('compatible')
  for (const k of ['3A', '8A']) expect(await hl(page, k)).toBe('boost')

  // Library counts under the wheel, tap → filtered library list.
  const chips = page.getByTestId('wheel-counts').getByRole('button')
  await expect(chips.first()).toBeVisible()
  await chips.first().click()
  await expect(page.getByTestId('library-key-filter')).toBeVisible()
  await expect(page.getByTestId('tab-library')).toHaveAttribute('aria-current', 'page')
})

test('wheel works offline', async ({ page, context }) => {
  await page.goto('./')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload()
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)
  await context.setOffline(true)
  await page.reload()
  await page.getByTestId('wheel-button').click()
  await select(page, '8A')
  expect(await hl(page, '9A')).toBe('compatible')
  await context.setOffline(false)
})
