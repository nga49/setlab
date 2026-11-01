import { expect, test } from '@playwright/test'

test('library: search, filters, detail edit saved as override, quick-add wishlist, insights', async ({ page }) => {
  await page.goto('./#/library')
  await expect(page.getByTestId('sync-card')).toBeVisible()
  await page.getByTestId('library-search').fill('Demo Track K')
  await expect(page.getByTestId('library-count')).toContainText(/^1 of/)
  await page.getByTestId('lib-demo:11').click()
  await expect(page.getByTestId('track-detail')).toBeVisible()
  await page.getByTestId('detail-energy').fill('9')
  await page.getByTestId('detail-save').click()
  await page.getByTestId('lib-demo:11').click()
  await expect(page.getByTestId('detail-energy')).toHaveValue('9')
  await page.keyboard.press('Escape')

  await page.getByTestId('library-search').fill('')
  await page.getByTestId('open-filters').click()
  await page.getByRole('button', { name: /✏️ wishlist/ }).click()
  await page.getByRole('button', { name: 'Show tracks' }).click()
  await expect(page.getByTestId('library-count')).toContainText(/^0 of/)

  await page.getByTestId('quick-add-open').click()
  await page.getByTestId('qa-artist').fill('Demo Artist 99')
  await page.getByTestId('qa-title').fill('Demo Track Wish')
  await page.getByTestId('qa-bpm').fill('122')
  await page.getByTestId('qa-key').fill('9A')
  await page.getByTestId('qa-save').click()
  await expect(page.getByTestId('library-count')).toContainText(/^1 of/)

  await page.getByTestId('library-insights').click()
  await expect(page.getByTestId('heatmap')).toBeVisible()
  await expect(page.getByTestId('bpm-histogram')).toBeVisible()
  await expect(page.getByTestId('gap-finder').locator('li').first()).toBeVisible()
})

test('ACCEPT library: 5,000 tracks scroll with no frame over 50 ms', async ({ page }) => {
  await page.goto('./?e2e=1#/library')
  await page.waitForFunction(() => !!(window as unknown as { __setlab?: unknown }).__setlab)
  await page.evaluate(async () => {
    const { db } = (window as unknown as { __setlab: { db: { tracks: { bulkPut: (x: unknown[]) => Promise<unknown> }; settings: { put: (x: unknown) => Promise<unknown> } } } }).__setlab
    const keys = ['1A', '2B', '3A', '4B', '5A', '6B', '7A', '8B', '9A', '10B', '11A', '12B']
    const genres = ['Tech House', 'Deep House', 'Afro House', 'Melodic House & Techno']
    const tracks = Array.from({ length: 5000 }, (_, i) => ({
      id: `rb:${i}`,
      artist: `Bench Artist ${i % 400}`,
      title: `Bench Track ${i}`,
      remix: null,
      genre: genres[i % 4],
      bpm: 118 + (i % 14),
      camelot: keys[i % 12],
      lengthSec: 360,
      year: 2015 + (i % 11),
      source: 'rekordbox',
      status: 'active',
    }))
    await db.tracks.bulkPut(tracks)
  })
  await expect(page.getByTestId('library-count')).toContainText('5,000 of 5,000', { timeout: 20000 })
  const maxFrame = await page.evaluate(async () => {
    const el = document.querySelector('[data-testid="library-list"]') as HTMLElement
    const frames: number[] = []
    let last = performance.now()
    for (let i = 0; i < 120; i++) {
      el.scrollTop += 240
      await new Promise((r) => requestAnimationFrame(r))
      const now = performance.now()
      frames.push(now - last)
      last = now
    }
    return Math.max(...frames.slice(2))
  })
  console.log('max frame while scrolling 5,000 tracks (ms):', Math.round(maxFrame))
  expect(maxFrame).toBeLessThan(50)
})
