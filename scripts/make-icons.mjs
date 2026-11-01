// Renders public/favicon.svg into the PWA PNG icons. Run: npm run icons
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8')
const out = (n) => new URL(`../public/icons/${n}`, import.meta.url).pathname
const browser = await chromium.launch()
const page = await browser.newPage()

async function render(file, size, { pad = 0, bg = 'transparent' } = {}) {
  await page.setViewportSize({ width: size, height: size })
  const inner = size - pad * 2
  await page.setContent(
    `<html><body style="margin:0;background:${bg}"><div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center">` +
      svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `) +
      `</div></body></html>`,
  )
  await page.screenshot({ path: out(file), omitBackground: bg === 'transparent' })
}

await render('icon-192.png', 192)
await render('icon-512.png', 512)
// Maskable: full-bleed walnut with the reel inside the 80% safe zone.
await render('icon-maskable-512.png', 512, { pad: 56, bg: '#2B1D14' })
await render('apple-touch-icon.png', 180, { pad: 0, bg: '#2B1D14' })
await browser.close()
console.log('icons written')
