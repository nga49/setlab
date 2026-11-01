import { expect, test } from '@playwright/test'

test('no API key: AI features show the hint, everything else works', async ({ page }) => {
  await page.goto('./#/library/missing')
  await expect(page.getByText('Add your Claude API key in Settings to use this.').first()).toBeVisible()
  await expect(page.getByTestId('missing-search')).toHaveCount(0)
  await expect(page.getByText('🎧')).toHaveCount(0) // Spotify chip hidden
  await expect(page.getByTestId('shopping-list')).toBeVisible()

  await page.getByTestId('open-settings').click()
  await expect(page.getByTestId('ai-meter')).toContainText('This month: ~€0.00 of €5')

  await page.keyboard.press('Escape')
  await page.goto('./#/sets/organizer')
  await page.getByTestId('open-paste').click()
  await page.getByTestId('paste-input').fill('Nobody Real - Imaginary Song')
  await expect(page.getByText('needs API key').first()).toBeVisible()
})
