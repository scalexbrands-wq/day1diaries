const crypto = require('crypto')

// Word-count thresholds from the certificate spec.
function computeImpactLevel(wordCount) {
  if (wordCount >= 1000) return 'Community Mentor'
  if (wordCount >= 500) return 'Future Inspirer'
  if (wordCount >= 200) return 'Career Guide'
  return 'Emerging Contributor'
}

const IMPACT_LEVEL_ICONS = {
  'Emerging Contributor': '🌱',
  'Career Guide': '🧭',
  'Future Inspirer': '✨',
  'Community Mentor': '🏆',
}

// Keyword bank for the rule-based "AI insights" tags — no LLM call.
const TAG_KEYWORDS = {
  'Confidence Building': ['confiden', 'nervous', 'scared', 'anxious', 'overcame', 'believed in myself'],
  'Team Collaboration': ['team', 'colleague', 'together', 'collaborat', 'co-worker', 'teammate'],
  'Communication': ['communicat', 'asked questions', 'spoke up', 'presentation', 'explained'],
  'Learning Mindset': ['learned', 'learning', 'lesson', 'curious', 'mistake', 'grow'],
  'Leadership': ['led', 'leadership', 'leader', 'initiative', 'responsib', 'mentor'],
  'Adaptability': ['adapt', 'change', 'new environment', 'flexible', 'unfamiliar'],
  'Problem Solving': ['solved', 'problem', 'figured out', 'solution', 'troubleshoot', 'fixed'],
  'Growth Potential': ['grow', 'future', 'potential', 'ambition', 'goal', 'career path'],
  'Ownership': ['ownership', 'accountab', 'took charge', 'my responsibility', 'own it'],
  'Innovation': ['innovat', 'idea', 'creative', 'new approach', 'improve'],
}

function extractInsightTags(content) {
  const text = (content || '').toLowerCase()
  const tags = Object.entries(TAG_KEYWORDS)
    .filter(([, keywords]) => keywords.some(k => text.includes(k)))
    .map(([tag]) => tag)
  return tags.length ? tags : ['Growth Potential']
}

// Splits on sentence-ending punctuation, keeping the punctuation.
function splitSentences(content) {
  return (content || '').replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]+/g) || [(content || '').trim()]
}

// Returns a short quote-style highlight. Stories under 500 chars are
// shown verbatim; longer ones are condensed to the first sentence plus
// the most "insight-bearing" sentence found elsewhere in the story.
function extractHighlight(content) {
  const trimmed = (content || '').trim()
  if (trimmed.length <= 500) return trimmed

  const sentences = splitSentences(trimmed)
  if (sentences.length <= 2) return sentences.join(' ').trim()

  const allKeywords = Object.values(TAG_KEYWORDS).flat()
  const first = sentences[0].trim()
  const rest = sentences.slice(1)
  const scored = rest
    .map(s => ({ s, score: allKeywords.filter(k => s.toLowerCase().includes(k)).length }))
    .sort((a, b) => b.score - a.score)
  const second = (scored[0]?.s || rest[rest.length - 1]).trim()

  return `${first} ${second}`.trim()
}

function generateCertificateNumber() {
  const code = crypto.randomBytes(6).toString('hex').toUpperCase().slice(0, 6)
  return `D1D-CERT-${code}`
}

module.exports = {
  computeImpactLevel,
  IMPACT_LEVEL_ICONS,
  extractInsightTags,
  extractHighlight,
  generateCertificateNumber,
}
