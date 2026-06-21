const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')

const client = new S3Client({ region: process.env.AWS_REGION })
const BUCKET = process.env.CERTIFICATES_S3_BUCKET

function isConfigured() {
  return Boolean(BUCKET && process.env.AWS_REGION)
}

async function uploadBuffer(key, buffer, contentType) {
  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }))
  return `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
}

function publicUrlFor(key) {
  return `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
}

// Signs a short-lived PUT URL so the browser can upload directly to S3
// (e.g. voice-story audio) without the file passing through the API at
// all. Requires the bucket to allow cross-origin PUT via a CORS config —
// see infrastructure/main.tf (not added by this helper, just used by it).
async function getPresignedPutUrl(key, contentType, expiresInSeconds = 300) {
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType })
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds })
}

module.exports = { uploadBuffer, isConfigured, publicUrlFor, getPresignedPutUrl }
