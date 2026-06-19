// Replaces {{variable}} tokens in template subject/HTML with values
// from the recipient's row. Unknown tokens render as empty string —
// templates are always admin-authored, so silent blanking (rather
// than throwing) keeps a typo in one row from failing a whole send.
function render(text, variables = {}) {
  if (!text) return text
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const value = variables[key]
    return value === undefined || value === null ? '' : String(value)
  })
}

// Pulls the {{tokens}} referenced in a piece of text, for the admin
// UI's "available variables" helper panel.
function extractVariables(text) {
  if (!text) return []
  const matches = text.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)
  return [...new Set([...matches].map(m => m[1]))]
}

module.exports = { render, extractVariables }
