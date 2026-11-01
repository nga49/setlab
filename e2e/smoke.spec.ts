import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/** Final smoke test across all tabs at 390x844, with automated accessibility checks. */

async function axe(page: Page, label: string) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  const serious = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  if (serious.length) console.log(label, JSON.stringify(serious.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 3).map((n) => n.target) })), null, 1))
  expect(serious, `${label}: ${serious.map((v) => v.id).join(', ')}`).toEqual([])
}

test('SMOKE: every tab renders, works with demo data and passes axe (serious/critical)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await expect(page.getByTestId('app-name')).toBeVisible()

  // Sets
  await page.getByTestId('tab-sets').click()
  await page.getByTestId('build').click()
  await expect(page.getByTestId('version-journey')).toBeVisible()
  await axe(page, 'sets')
  await page.getByTestId('sets-party').click()
  await axe(page, 'party')
  await page.getByTestId('sets-saved').click()
  await axe(page, 'saved')

  // Live
  await page.getByTestId('tab-live').click()
  await page.getByTestId('live-search').fill('Demo Track A')
  await page.getByTestId('live-pick-demo:01').click()
  await expect(page.getByTestId('next-list').getByRole('button')).toHaveCount(5)
  await axe(page, 'live')

  // Library
  await page.getByTestId('tab-library').click()
  await expect(page.getByTestId('library-list')).toBeVisible()
  await axe(page, 'library')
  await page.getByTestId('library-insights').click()
  await expect(page.getByTestId('heatmap')).toBeVisible()
  await axe(page, 'insights')
  await page.getByTestId('library-missing').click()
  await axe(page, 'missing')

  // Practice
  await page.getByTestId('tab-practice').click()
  await expect(page.getByTestId('sessions')).toBeVisible() // the live session above was logged
  await axe(page, 'practice')

  // Wheel
  await page.getByTestId('wheel-button').click()
  await page.locator('[data-testid="wheel"] g[data-key="8A"]').click()
  await axe(page, 'wheel')
  await page.getByTestId('wheel-close').click()

  // Settings
  await page.getByTestId('open-settings').click()
  await expect(page.getByTestId('settings-sheet')).toBeVisible()
  await axe(page, 'settings')
})

test('backup: export downloads a JSON file', async ({ page }) => {
  await page.goto('./')
  await page.getByTestId('open-settings').click()
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('backup-export').click()])
  expect(download.suggestedFilename()).toMatch(/^setlab-backup-\d{4}-\d{2}-\d{2}\.json$/)
})
