// Free machine translation via MyMemory (https://mymemory.translated.net) —
// switched off AWS Translate since that AWS account isn't subscribed to
// the service. No API key required; anonymous usage is capped at 500
// chars per request and ~1000 words/day per IP, so long story content is
// chunked into sentence-bounded pieces and translated piece by piece.
const MYMEMORY_ENDPOINT = 'https://api.mymemory.translated.net/get'
const MAX_CHUNK_CHARS = 450

function isConfigured() {
  return true // no credentials/infra needed
}

// Splits on sentence boundaries first, packing as many sentences as fit
// under MAX_CHUNK_CHARS per chunk; falls back to a hard slice for any
// single "sentence" that's already longer than the limit on its own.
function chunkText(text) {
  const sentences = text.split(/(?<=[.!?।])\s+/)
  const chunks = []
  let current = ''
  for (const sentence of sentences) {
    const piece = current ? `${current} ${sentence}` : sentence
    if (piece.length <= MAX_CHUNK_CHARS) {
      current = piece
      continue
    }
    if (current) chunks.push(current)
    current = sentence.length <= MAX_CHUNK_CHARS ? sentence : ''
    if (sentence.length > MAX_CHUNK_CHARS) {
      for (let i = 0; i < sentence.length; i += MAX_CHUNK_CHARS) chunks.push(sentence.slice(i, i + MAX_CHUNK_CHARS))
    }
  }
  if (current) chunks.push(current)
  return chunks.length ? chunks : ['']
}

async function translateChunk(text, targetLang) {
  if (!text.trim()) return text
  const url = `${MYMEMORY_ENDPOINT}?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`MyMemory request failed: ${res.status}`)
  const json = await res.json()
  if (json.responseStatus && Number(json.responseStatus) >= 400) {
    throw new Error(json.responseDetails || 'MyMemory translation failed')
  }
  return json.responseData?.translatedText || text
}

async function translateText(text, targetLang) {
  if (!text) return ''
  const chunks = chunkText(text)
  const translated = []
  // Sequential, not parallel — MyMemory's free tier rate-limits aggressive
  // concurrent requests from the same IP.
  for (const chunk of chunks) {
    translated.push(await translateChunk(chunk, targetLang))
  }
  return translated.join(' ')
}

module.exports = { translateText, isConfigured }
