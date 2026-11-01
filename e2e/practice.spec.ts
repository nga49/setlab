import { expect, test } from '@playwright/test'

test('practice: log from a saved set, rate a transition, export rekordbox XML', async ({ page }) => {
  // Save a set first.
  await page.goto('./#/sets/organizer')
  await page.getByTestId('open-picker').click()
  for (const id of ['demo:01', 'demo:05', 'demo:12']) await page.getByTestId(`pick-${id}`).click()
  await page.getByTestId('picker-done').click()
  await page.getByRole('button', { name: 'All picked' }).click()
  await page.getByTestId('build').click()
  await page.getByTestId('edit-journey').click()
  await page.getByTestId('set-name').fill('Practice set')
  await page.getByTestId('save-set').click()

  await page.getByTestId('tab-practice').click()
  await page.getByTestId('log-practice').click()
  await page.getByTestId('set-pick').getByRole('button', { name: /Practice set/ }).click()
  await expect(page.getByTestId('session-sheet')).toBeVisible()
  await page.getByTestId('rate-row').first().getByTestId('rate-1').click()
  await expect(page.getByTestId('rate-row').first().getByTestId('rate-1')).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('rating-counts')).toContainText('🔥 1')
  await expect(page.getByTestId('session-row')).toHaveCount(1)

  await page.getByTestId('practice-export').click()
  await page.getByTestId('set-pick').getByRole('button', { name: /Practice set/ }).click()
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-xml').click()])
  expect(download.suggestedFilename()).toBe('setlab-practice-set.xml')
})
