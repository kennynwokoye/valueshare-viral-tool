const fs = require('fs')
const path = require('path')

async function fixDir(dir) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return 0
  }
  let fixed = 0
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      fixed += await fixDir(full)
      continue
    }
    if (!/\.(mjs|js|cjs)$/.test(entry.name)) continue
    const src = fs.readFileSync(full, 'utf8')
    // Fix all backslash paths that should be forward slashes
    const out = src
      // '\var\task\...' → '/var/task/...'
      .replace(/\\var\\task\\/g, '/var/task/')
      // '\\var\\task\\...' (double-escaped) → '/var/task/...'
      .replace(/\\\\var\\\\task\\\\/g, '/var/task/')
      // remaining double backslashes inside /var/task/... paths → /
      .replace(/(\/var\/task\/[^'"`\n]*?)\\\\([^'"`\n]*?)/g, function replacer(match, p1, p2) {
        return p1 + '/' + p2
      })
      .replace(/(\/var\/task\/[^'"`\n]*?)\\\\([^'"`\n]*?)/g, function replacer(match, p1, p2) {
        return p1 + '/' + p2
      })
      .replace(/(\/var\/task\/[^'"`\n]*?)\\\\([^'"`\n]*?)/g, function replacer(match, p1, p2) {
        return p1 + '/' + p2
      })
      // remaining single backslashes inside /var/task/... paths → /
      .replace(/(\/var\/task\/[^'"`\n]*?)\\([^'"`\n]*?)/g, function replacer(match, p1, p2) {
        return p1 + '/' + p2
      })
      .replace(/(\/var\/task\/[^'"`\n]*?)\\([^'"`\n]*?)/g, function replacer(match, p1, p2) {
        return p1 + '/' + p2
      })
      .replace(/(\/var\/task\/[^'"`\n]*?)\\([^'"`\n]*?)/g, function replacer(match, p1, p2) {
        return p1 + '/' + p2
      })
    if (out !== src) {
      fs.writeFileSync(full, out)
      fixed++
      console.log(`  Fixed paths in: ${full}`)
    }
  }
  return fixed
}

module.exports = {
  onBuild: async ({ constants }) => {
    console.log('Fixing Windows backslash paths in Netlify handler files...')

    const dirs = [
      path.join(constants.PUBLISH_DIR, '..', '.netlify', 'functions-internal'),
      path.join(constants.PUBLISH_DIR, '..', '.netlify', 'dist'),
    ]

    let total = 0
    for (const dir of dirs) {
      total += await fixDir(dir)
    }
    console.log(`Done. Fixed ${total} file(s).`)
  }
}
