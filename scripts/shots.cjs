// Screenshots of each tab at 390x844 for design review. Usage: node scripts/shots.cjs <outdir> [hash...]
const { chromium } = require('playwright')
;(async () => {
  const out = process.argv[2] || '/tmp/shots'
  const hashes = process.argv.slice(3).length ? process.argv.slice(3) : ['sets', 'live', 'library', 'practice']
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  for (const h of hashes) {
    await p.goto('http://localhost:4173/setlab/#/' + h)
    await p.waitForTimeout(700)
    await p.screenshot({ path: `${out}/${h.replace(/\//g, '_')}.png` })
  }
  await b.close()
})()
