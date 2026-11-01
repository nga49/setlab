import { expect, test } from '@playwright/test'

test('ACCEPT live: now playing, pick next, request, path shown (390x844)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./#/live')
  await page.getByTestId('live-search').fill('Demo Track A')
  await page.getByTestId('live-pick-demo:01').click()
  await expect(page.getByTestId('now-playing')).toContainText('Demo Track A')

  const next = page.getByTestId('next-list').getByRole('button')
  await expect(next).toHaveCount(5)
  const firstTitle = (await page.getByTestId('next-0').textContent()) ?? ''
  await page.getByTestId('next-0').click()
  await expect(page.getByTestId('now-playing')).not.toContainText('Demo Track A\n')
  expect(firstTitle.length).toBeGreaterThan(3)

  await page.getByTestId('request').click()
  await page.getByTestId('request-input').fill('Demo Track Z')
  await page.getByTestId('request-results').getByRole('button').first().click()
  const path = page.getByTestId('request-path')
  await expect(path).toContainText('Path from now')
  await expect(path).toContainText(/~\d+ tracks · ~\d+ min|No smooth path/)
  await expect(page.getByTestId('request-before').getByRole('button')).toHaveCount(3)
  await expect(page.getByTestId('request-after').getByRole('button')).toHaveCount(3)
})

test('request not in library: manual BPM + key gives the 3 blocks and a Copy button', async ({ page }) => {
  await page.goto('./#/live')
  await page.getByTestId('live-search').fill('Demo Track B')
  await page.getByTestId('live-pick-demo:02').click()
  await page.getByTestId('request').click()
  await page.getByTestId('request-input').fill('Someone Unknown - Imaginary Song')
  await expect(page.getByTestId('copy-beatport').first()).toBeVisible()
  await page.getByTestId('request-bpm').fill('124')
  await page.getByTestId('request-key').fill('Am')
  await page.getByTestId('request-manual').click()
  await expect(page.getByTestId('request-after').getByRole('button')).toHaveCount(3)
})

test('gig mode: stripped down, next 3, request button, wheel button', async ({ page }) => {
  await page.goto('./#/live')
  await page.getByTestId('live-search').fill('Demo Track C')
  await page.getByTestId('live-pick-demo:03').click()
  await page.getByTestId('gig-toggle').click()
  await expect(page.getByTestId('next-list').getByRole('button')).toHaveCount(3)
  await expect(page.getByTestId('request')).toBeVisible()
  await expect(page.getByTestId('wheel-button')).toBeVisible()
  await expect(page.getByTestId('tab-sets')).toHaveCount(0)
  const size = await page.getByTestId('next-0').evaluate((el) => parseFloat(getComputedStyle(el.querySelector('span span')!).fontSize))
  expect(size).toBeGreaterThanOrEqual(20)
  await page.getByTestId('gig-toggle').click()
  await expect(page.getByTestId('tab-sets')).toBeVisible()
})

test('bridge finder from the live tab', async ({ page }) => {
  await page.goto('./#/live')
  await page.getByTestId('live-search').fill('Demo Track D')
  await page.getByTestId('live-pick-demo:04').click()
  await page.getByTestId('open-bridge').click()
  await page.getByTestId('bridge-B').click()
  await page.getByTestId('picker-search').fill('Demo Track Q')
  await page.getByTestId('picker-list').getByRole('button').first().click()
  await expect(page.getByTestId('bridge-singles').locator('li')).toHaveCount(3)
})
