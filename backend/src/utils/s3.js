const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')

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

module.exports = { uploadBuffer, isConfigured }
