const chromium = require('@sparticuz/chromium')
const puppeteer = require('puppeteer-core')

let browserPromise = null

// Each Chromium instance is heavy (150-300MB+); reuse a single browser
// across requests and cap concurrent renders so a burst of certificate
// generations can't OOM the ECS task.
function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.executablePath().then(executablePath =>
      puppeteer.launch({
        executablePath,
        args: chromium.args,
        headless: chromium.headless,
      })
    )
  }
  return browserPromise
}

const MAX_CONCURRENT_RENDERS = 2
let activeRenders = 0
const waiters = []

async function acquireSlot() {
  if (activeRenders < MAX_CONCURRENT_RENDERS) {
    activeRenders++
    return
  }
  await new Promise(resolve => waiters.push(resolve))
  activeRenders++
}

function releaseSlot() {
  activeRenders--
  const next = waiters.shift()
  if (next) next()
}

async function withPage(viewport, fn) {
  await acquireSlot()
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    await page.setViewport(viewport)
    return await fn(page)
  } finally {
    await page.close()
    releaseSlot()
  }
}

// The template is laid out at 1600px CSS width (~1132px tall, A4-landscape
// ratio). The PNG output must be exactly 3508x2480 (A4 landscape @ 300dpi),
// so we render at a deviceScaleFactor that maps 1600 CSS px -> 3508px, then
// clip to a height that maps to exactly 2480px — guaranteeing exact output
// dimensions regardless of small drifts in the template's natural height.
const LAYOUT_WIDTH = 1600
const TARGET_PNG_WIDTH = 3508
const TARGET_PNG_HEIGHT = 2480
const PNG_SCALE = TARGET_PNG_WIDTH / LAYOUT_WIDTH
const CLIP_HEIGHT = TARGET_PNG_HEIGHT / PNG_SCALE
const PDF_HEIGHT = 1200 // generous buffer over the template's ~1132px natural height — keeps everything on one page

async function renderCertificate(html) {
  return withPage({ width: LAYOUT_WIDTH, height: Math.ceil(CLIP_HEIGHT) + 40, deviceScaleFactor: PNG_SCALE }, async (page) => {
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pngBuffer = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: LAYOUT_WIDTH, height: CLIP_HEIGHT },
    })
    const pdfBuffer = await page.pdf({
      width: `${LAYOUT_WIDTH}px`, height: `${PDF_HEIGHT}px`, printBackground: true, pageRanges: '1',
    })
    return { pngBuffer, pdfBuffer }
  })
}

async function renderSocialPreview(html) {
  return withPage({ width: 1200, height: 1200 }, async (page) => {
    await page.setContent(html, { waitUntil: 'networkidle0' })
    return page.screenshot({ type: 'png' })
  })
}

module.exports = { renderCertificate, renderSocialPreview }
