import { expect, test } from '@playwright/test'

test('app shell: tabs, settings, wheel button, demo library', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByTestId('app-name')).toBeVisible()
  await expect(page.getByTestId('demo-badge')).toBeVisible()
  for (const t of ['sets', 'live', 'library', 'practice']) {
    await page.getByTestId(`tab-${t}`).click()
    await expect(page.getByTestId(`tab-${t}`)).toHaveAttribute('aria-current', 'page')
  }
  await expect(page.getByTestId('wheel-button')).toBeVisible()
  await page.getByTestId('open-settings').click()
  await expect(page.getByTestId('settings-sheet')).toBeVisible()
})

test('installable: manifest, icons and service worker', async ({ page, request }) => {
  await page.goto('./')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(href).toBeTruthy()
  const res = await request.get(new URL(href!, page.url()).toString())
  expect(res.ok()).toBe(true)
  const m = await res.json()
  expect(m.name).toBeTruthy()
  expect(m.display).toBe('standalone')
  expect(m.start_url).toBeTruthy()
  const sizes = m.icons.map((i: { sizes: string }) => i.sizes)
  expect(sizes).toContain('192x192')
  expect(sizes).toContain('512x512')
  for (const i of m.icons) {
    const r = await request.get(new URL(i.src, new URL(href!, page.url())).toString())
    expect(r.ok(), i.src).toBe(true)
  }
  const sw = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready
    return !!reg.active
  })
  expect(sw).toBe(true)
})

test('offline: shell loads with no network after first visit', async ({ page, context }) => {
  await page.goto('./')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  // Make sure the page is controlled by the service worker before going offline.
  await page.reload()
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByTestId('app-name')).toBeVisible()
  await page.getByTestId('tab-library').click()
  await expect(page.getByTestId('tab-library')).toHaveAttribute('aria-current', 'page')
  await context.setOffline(false)
})

test('app name, title font from a file on the phone, page color under the tab bar', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByTestId('app-name')).toHaveText('Awesome Mix')
  await expect(page).toHaveTitle(/^Awesome Mix/)
  // Anything outside the app root (iOS bottom gap) is painted tab-bar brown.
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).toBe('rgb(30, 20, 14)')

  await page.getByTestId('open-settings').click()
  // Not a font: refused, nothing saved.
  await page.getByTestId('title-font-file').setInputFiles({ name: 'notes.ttf', mimeType: 'font/ttf', buffer: Buffer.from('not a font') })
  await expect(page.getByText('This file is not a font the phone can use', { exact: false })).toBeVisible()
  await expect(page.getByTestId('title-font-name')).toContainText('Default')

  // An OFL font from node_modules stands in for a personal font.
  await page.getByTestId('title-font-file').setInputFiles('node_modules/@fontsource/bungee/files/bungee-latin-400-normal.woff2')
  await expect(page.getByTestId('title-font-name')).toContainText('bungee-latin-400-normal')
  const applied = () =>
    page.evaluate(() => ({
      stack: document.documentElement.style.getPropertyValue('--font-title'),
      loaded: document.fonts.check('20px UserTitle'),
      header: getComputedStyle(document.querySelector('[data-testid="app-name"]')!).fontFamily,
    }))
  let f = await applied()
  expect(f.stack).toContain('UserTitle')
  expect(f.loaded).toBe(true)
  expect(f.header).toContain('UserTitle')

  // Stored on the device: still there after a reload.
  await page.reload()
  await expect.poll(async () => (await applied()).stack).toContain('UserTitle')

  await page.getByTestId('open-settings').click()
  await page.getByTestId('title-font-reset').click()
  await expect(page.getByTestId('title-font-name')).toContainText('Default')
  f = await applied()
  expect(f.stack).toBe('')
})
