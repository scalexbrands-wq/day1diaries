// Downscale + recompress user-uploaded images before they're stored.
// Without this, a raw phone-camera photo (often 3-4000px, several MB)
// uploaded as e.g. a 40px avatar gets stored and served at full size
// forever — paid for in bandwidth/load time on every page that renders it.
const sharp = require('sharp')

// Animated formats lose all but the first frame under sharp's default
// resize, and SVG is already tiny/vector — neither benefits from this.
const SKIP_MIMETYPES = new Set(['image/svg+xml', 'image/gif'])

async function resizeImage(buffer, mimetype, { maxWidth, maxHeight } = {}) {
  if (!mimetype || !mimetype.startsWith('image/') || SKIP_MIMETYPES.has(mimetype)) {
    return buffer
  }
  try {
    let pipeline = sharp(buffer)
      .rotate() // apply EXIF orientation, then strip it
      .resize({ width: maxWidth, height: maxHeight, fit: 'inside', withoutEnlargement: true })

    if (mimetype === 'image/png') pipeline = pipeline.png({ quality: 80, compressionLevel: 9 })
    else if (mimetype === 'image/webp') pipeline = pipeline.webp({ quality: 80 })
    else pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true })

    return await pipeline.toBuffer()
  } catch (err) {
    console.error('[imageResize] failed, storing original:', err.message)
    return buffer
  }
}

module.exports = { resizeImage }
