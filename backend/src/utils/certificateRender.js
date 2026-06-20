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

// The Magazine Cover gift template is a tall poster, not a landscape
// certificate — same A4 paper, just rotated, output as A4-portrait
// @300dpi (2480x3508) from a 1240px-wide layout (clean x2 scale factor).
const PORTRAIT_LAYOUT_WIDTH = 1240
const PORTRAIT_TARGET_PNG_WIDTH = 2480
const PORTRAIT_TARGET_PNG_HEIGHT = 3508
const PORTRAIT_PNG_SCALE = PORTRAIT_TARGET_PNG_WIDTH / PORTRAIT_LAYOUT_WIDTH
const PORTRAIT_CLIP_HEIGHT = PORTRAIT_TARGET_PNG_HEIGHT / PORTRAIT_PNG_SCALE
const PORTRAIT_PDF_HEIGHT = 1800

// `styleKey` selects orientation — only the Magazine Cover style is a
// portrait poster; every other gift/story certificate stays A4 landscape.
async function renderCertificate(html, styleKey) {
  const portrait = styleKey === 'magazine_cover'
  const width = portrait ? PORTRAIT_LAYOUT_WIDTH : LAYOUT_WIDTH
  const clipHeight = portrait ? PORTRAIT_CLIP_HEIGHT : CLIP_HEIGHT
  const scale = portrait ? PORTRAIT_PNG_SCALE : PNG_SCALE
  const pdfHeight = portrait ? PORTRAIT_PDF_HEIGHT : PDF_HEIGHT

  return withPage({ width, height: Math.ceil(clipHeight) + 40, deviceScaleFactor: scale }, async (page) => {
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pngBuffer = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width, height: clipHeight },
    })
    const pdfBuffer = await page.pdf({
      width: `${width}px`, height: `${pdfHeight}px`, printBackground: true, pageRanges: '1',
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

// Membership card — standard landscape ID-card ratio, laid out at 1050x660
// CSS px (~CR80 card proportions, scaled up for crisp PNG/PDF output).
const CARD_WIDTH = 1050
const CARD_HEIGHT = 660
const CARD_SCALE = 2 // -> 2100x1320 PNG

async function renderMembershipCard(html) {
  return withPage({ width: CARD_WIDTH, height: CARD_HEIGHT, deviceScaleFactor: CARD_SCALE }, async (page) => {
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pngBuffer = await page.screenshot({ type: 'png' })
    const pdfBuffer = await page.pdf({
      width: `${CARD_WIDTH}px`, height: `${CARD_HEIGHT}px`, printBackground: true, pageRanges: '1',
    })
    return { pngBuffer, pdfBuffer }
  })
}

module.exports = { renderCertificate, renderSocialPreview, renderMembershipCard }
