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

async function renderCertificate(html) {
  return withPage({ width: 1600, height: 1131 }, async (page) => {
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pngBuffer = await page.screenshot({ type: 'png' })
    const pdfBuffer = await page.pdf({ width: '1600px', height: '1131px', printBackground: true })
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
