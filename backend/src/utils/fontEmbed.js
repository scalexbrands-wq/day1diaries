// Puppeteer's headless Chromium has no guarantee of being able to reach
// fonts.googleapis.com mid-render (and even if it can, repeating that
// fetch on every certificate would be wasteful) — so we fetch the woff2
// files once, base64-embed them into a local @font-face block, and
// cache that block in memory for the life of the process.
const GOOGLE_FONTS_CSS_URL =
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;900&family=Inter:wght@400;500;600;700&display=swap'

// Google only serves woff2 to UAs it recognizes as modern browsers.
const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

let cachedPromise = null

async function fetchEmbeddedFontCss() {
  const cssRes = await fetch(GOOGLE_FONTS_CSS_URL, { headers: { 'User-Agent': CHROME_UA } })
  if (!cssRes.ok) throw new Error(`Google Fonts CSS fetch failed: ${cssRes.status}`)
  const css = await cssRes.text()

  const blocks = css.match(/@font-face\s*{[^}]+}/g) || []
  const embedded = await Promise.all(blocks.map(async (block) => {
    const urlMatch = block.match(/url\((https:\/\/[^)]+\.woff2)\)/)
    if (!urlMatch) return block
    const fontRes = await fetch(urlMatch[1])
    if (!fontRes.ok) return block
    const buffer = Buffer.from(await fontRes.arrayBuffer())
    const dataUri = `data:font/woff2;base64,${buffer.toString('base64')}`
    return block.replace(urlMatch[1], dataUri)
  }))

  return embedded.join('\n')
}

// Returns the cached @font-face CSS, or '' if it could never be fetched
// (certificate rendering falls back to system fonts rather than failing).
function getEmbeddedFontCss() {
  if (!cachedPromise) {
    cachedPromise = fetchEmbeddedFontCss().catch((err) => {
      console.error('Font embed error (falling back to system fonts):', err.message)
      cachedPromise = null
      return ''
    })
  }
  return cachedPromise
}

module.exports = { getEmbeddedFontCss }
