import { expect, test } from '@playwright/test'

test('organizer: pick, lock 2, build 3 versions, edit and save to the rack', async ({ page }) => {
  await page.goto('./#/sets/organizer')
  await page.getByTestId('open-picker').click()
  await page.getByTestId('picker-search').fill('demo track')
  for (const id of ['demo:01', 'demo:05', 'demo:12', 'demo:20']) await page.getByTestId(`pick-${id}`).click()
  await page.getByTestId('picker-done').click()
  await expect(page.getByTestId('picked-list').locator('li')).toHaveCount(4)
  await page.getByTestId('lock-demo:05').click()
  await page.getByTestId('lock-demo:12').click()

  const t0 = Date.now()
  await page.getByTestId('build').click()
  await expect(page.getByTestId('version-journey')).toBeVisible()
  expect(Date.now() - t0).toBeLessThan(5000)
  await expect(page.getByTestId('version-smooth')).toBeAttached()
  await expect(page.getByTestId('version-keytour')).toBeAttached()

  const journey = page.getByTestId('setlist-journey')
  await expect(journey).toContainText('Demo Track E')
  await expect(journey).toContainText('Demo Track L')
  expect(await journey.getByTestId('transition-dot').count()).toBeGreaterThan(3)

  await page.getByTestId('edit-journey').click()
  await expect(page.getByTestId('set-editor')).toBeVisible()
  await page.getByTestId('set-name').fill('E2E warm-up')
  await page.getByTestId('save-set').click()
  await expect(page.getByTestId('tape-rack')).toContainText('E2E warm-up')
})

test('party: wedding set with filters', async ({ page }) => {
  await page.goto('./#/sets/party')
  await page.getByTestId('party-text').fill('lots of 2000s, no hard techno')
  await page.getByTestId('party-build').click()
  await expect(page.getByTestId('party-result')).toBeVisible()
  await expect(page.getByTestId('party-result')).toContainText('library tracks fit the filters')
})
