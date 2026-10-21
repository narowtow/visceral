// Capture README screenshots from a running site.
// Usage: npm run build && npx vite preview --port 4173  (in another terminal)
//        node scripts/screenshots.mjs [baseUrl]
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:4173/visceral/'
const out = new URL('../../docs/screenshots/', import.meta.url)
await mkdir(out, { recursive: true })

const shots = [
  { name: 'explorer', hash: '#/explore?location=WLD&sex=both&age=all&year=2023&measure=deaths&metric=ageStdRate&selectedOrgan=heart', viewport: { width: 1440, height: 900 } },
  { name: 'organ-panel', hash: '#/explore?location=JPN&sex=both&age=all&year=2023&measure=deaths&metric=ageStdRate&selectedOrgan=lungs', viewport: { width: 1440, height: 900 }, focus: true },
  { name: 'analysis', hash: '#/analysis', viewport: { width: 1440, height: 900 }, scrollTo: '.figure-age-rankings' },
  { name: 'mobile', hash: '#/explore?location=IND&sex=female&age=all&year=2023&measure=dalys&metric=ageStdRate&selectedOrgan=brain', viewport: { width: 390, height: 844 }, mobile: true },
]

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
for (const shot of shots) {
  const context = await browser.newContext({ viewport: shot.viewport, deviceScaleFactor: 2, colorScheme: 'dark', isMobile: !!shot.mobile, hasTouch: !!shot.mobile })
  const page = await context.newPage()
  page.on('console', msg => { if (msg.type() === 'error') console.error(`[${shot.name}] ${msg.text()}`) })
  page.on('response', res => { if (res.status() >= 400) console.error(`[${shot.name}] ${res.status()} ${res.url()}`) })
  await page.goto(base + shot.hash, { waitUntil: 'networkidle' })
  await page.waitForTimeout(4000) // let the model decode and the first frame render
  if (shot.focus) {
    await page.getByRole('button', { name: /focus/i }).first().click()
    await page.waitForTimeout(2000)
  }
  if (shot.scrollTo) {
    await page.locator(shot.scrollTo).first().scrollIntoViewIfNeeded()
    await page.waitForTimeout(1500)
  }
  const file = fileURLToPath(new URL(`${shot.name}.png`, out))
  await page.screenshot({ path: file, fullPage: false })
  console.log(`saved ${file}`)
  await context.close()
}
await browser.close()
