const BAD_WORDS = [
  // English profanity
  'fuck', 'fucking', 'fucker', 'fucked', 'fucks',
  'shit', 'shitting', 'shitty', 'bullshit',
  'asshole', 'arse',
  'bitch', 'bitching', 'bitches',
  'bastard', 'bastards',
  'cunt', 'cunts',
  'dick', 'dickhead',
  'pussy',
  'cock', 'cocksucker',
  'motherfucker', 'motherfucking',
  'prick',
  'whore', 'slut', 'sluts',
  // Hate speech
  'nigger', 'nigga', 'niggers',
  'faggot', 'faggots',
  'retard', 'retarded',
  // Hindi/Hinglish offensive words
  'madarchod', 'mc', 'bhosdike', 'bhenchod', 'bc',
  'chutiya', 'chut', 'randi', 'gaandu', 'gandu',
  'harami', 'kamina', 'kutte', 'saale', 'saali',
  'lund', 'lauda', 'madarjaat',
]

const WORD_RES = BAD_WORDS.map(w => ({
  word: w,
  re: new RegExp(`(?<![a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z])`, 'i'),
}))

/**
 * Scans text and returns an array of matched bad words.
 * Returns [] if none found.
 */
function scanBadWords(text) {
  if (!text) return []
  const found = []
  for (const { word, re } of WORD_RES) {
    if (re.test(text) && !found.includes(word)) found.push(word)
  }
  return found
}

module.exports = { scanBadWords }
