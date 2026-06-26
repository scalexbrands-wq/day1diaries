// Image storage with automatic fallback: uses S3 when configured
// (CERTIFICATES_S3_BUCKET + AWS_REGION), otherwise writes to local
// disk under backend/uploads/ and serves it via the static route
// mounted in index.js. This means image uploads (e.g. the landing
// page hero image) work out of the box in local/dev environments
// with no AWS setup required, and automatically switch to S3 once
// real credentials/bucket are configured.

const fs = require('fs')
const path = require('path')
const s3 = require('./s3')
const { resizeImage } = require('./imageResize')

const UPLOADS_DIR = path.join(__dirname, '../../uploads')

// `baseUrl` is the request's own origin (e.g. http://localhost:4000),
// used to build an absolute, browser-loadable URL for local fallback.
// `resizeOpts` (optional) — { maxWidth, maxHeight } — downscales/recompresses
// the image before it's written, since callers know the display context
// (e.g. an avatar never needs to be wider than ~512px) but multer hands
// us whatever the user's camera produced.
async function saveImage(key, buffer, contentType, baseUrl, resizeOpts) {
  if (resizeOpts) buffer = await resizeImage(buffer, contentType, resizeOpts)
  if (s3.isConfigured()) {
    return s3.uploadBuffer(key, buffer, contentType)
  }
  console.warn('[imageStorage] S3 not configured — saving to local disk. Note: on ECS this is ephemeral and not shared across tasks; configure CERTIFICATES_S3_BUCKET/AWS_REGION for production.')
  const filePath = path.join(UPLOADS_DIR, key)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, buffer)
  return `${baseUrl}/uploads/${key}`
}

module.exports = { saveImage, UPLOADS_DIR }
