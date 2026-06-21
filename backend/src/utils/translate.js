const { TranslateClient, TranslateTextCommand } = require('@aws-sdk/client-translate')

const client = new TranslateClient({ region: process.env.AWS_REGION })

function isConfigured() {
  return Boolean(process.env.AWS_REGION)
}

// AWS Translate's per-call limit is 10,000 bytes (UTF-8) — story content
// shouldn't realistically hit that, but truncate defensively rather than
// letting a long post 500 the whole request.
const MAX_BYTES = 9500
function truncate(text) {
  if (Buffer.byteLength(text, 'utf8') <= MAX_BYTES) return text
  let end = MAX_BYTES
  while (end > 0 && (text.charCodeAt(end) & 0xc0) === 0x80) end--
  return text.slice(0, end)
}

async function translateText(text, targetLang) {
  if (!text) return ''
  const { TranslatedText } = await client.send(new TranslateTextCommand({
    Text: truncate(text),
    SourceLanguageCode: 'auto',
    TargetLanguageCode: targetLang,
  }))
  return TranslatedText
}

module.exports = { translateText, isConfigured }
