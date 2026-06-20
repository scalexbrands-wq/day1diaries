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

// Deterministic 0-100 score — no LLM call, just a weighted blend of how
// much the story says (length), how many distinct strengths it shows
// (tag count), and how the community responded (engagement).
function computeImpactScore({ wordCount, tagCount, likesCount = 0, commentsCount = 0, savesCount = 0, sharesCount = 0, viewsCount = 0 }) {
  const lengthScore = Math.min(40, Math.round((wordCount / 1000) * 40))
  const tagScore = Math.min(30, tagCount * 7.5)
  const engagementRaw = viewsCount + likesCount * 2 + commentsCount * 3 + savesCount * 2 + sharesCount * 3
  const engagementScore = Math.min(30, Math.round(Math.log10(engagementRaw + 1) * 10))
  return Math.max(1, Math.min(100, Math.round(lengthScore + tagScore + engagementScore)))
}

function impactScoreLabel(score) {
  if (score >= 85) return 'Excellent Impact'
  if (score >= 65) return 'Great Impact'
  if (score >= 40) return 'Good Impact'
  return 'Promising Start'
}

// Short, tag-specific "what the AI noticed" lines — keyed off the same
// keyword bank as extractInsightTags, so they always match the tags
// actually shown on the certificate.
const KEY_LESSON_BY_TAG = {
  'Confidence Building': 'Confidence grows when curiosity is stronger than fear.',
  'Team Collaboration': 'Great first days are rarely solo — this one leaned on the people around them.',
  'Communication': 'Speaking up early made the unfamiliar feel a little more familiar.',
  'Learning Mindset': 'Every mistake here became a lesson, not a setback.',
  'Leadership': 'Initiative showed up before the title did.',
  'Adaptability': 'Comfort with change is already a career advantage.',
  'Problem Solving': 'Calm, practical thinking under pressure — a rare Day 1 trait.',
  'Growth Potential': 'This is a foundation built for the long run.',
  'Ownership': 'Taking responsibility early is what separates good hires from great ones.',
  'Innovation': 'Fresh eyes brought a fresh idea — exactly what teams need.',
}
const CAREER_INSIGHT_BY_TAG = {
  'Confidence Building': 'Professionals who name their nerves out loud build trust 3x faster with new teams.',
  'Team Collaboration': 'New hires who ask for help in week one ramp up significantly faster than those who don’t.',
  'Communication': 'Clear early communication is the #1 trait managers look for in first 90 days.',
  'Learning Mindset': 'A growth mindset on Day 1 predicts stronger performance reviews at 6 months.',
  'Leadership': 'Early initiative is one of the strongest predictors of future promotion.',
  'Adaptability': 'Professionals who actively ask questions adapt 42% faster during onboarding.',
  'Problem Solving': 'Hands-on problem solvers are remembered long after the first week ends.',
  'Growth Potential': 'Day 1 mindset compounds — small habits now shape years of career trajectory.',
  'Ownership': 'Ownership shown early is the single biggest signal of long-term reliability.',
  'Innovation': 'Fresh perspectives from new joiners are one of the most underused team assets.',
}
function keyLessonFor(tags) {
  return KEY_LESSON_BY_TAG[(tags || [])[0]] || 'Confidence grows when curiosity is stronger than fear.'
}
function careerInsightFor(tags) {
  return CAREER_INSIGHT_BY_TAG[(tags || [])[0]] || 'Professionals who actively ask questions adapt faster during onboarding.'
}

module.exports = {
  computeImpactLevel,
  IMPACT_LEVEL_ICONS,
  extractInsightTags,
  extractHighlight,
  generateCertificateNumber,
  computeImpactScore,
  impactScoreLabel,
  keyLessonFor,
  careerInsightFor,
}
