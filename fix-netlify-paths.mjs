// Fixes Windows backslash paths in Netlify server handler files
// so they resolve correctly on Netlify's Linux runtime.
import { readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const DIRS = [
  '.netlify/functions-internal/___netlify-server-handler',
  '.netlify/dist/run/handlers',
]

async function fixDir(dir) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return 0
  }
  let fixed = 0
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      fixed += await fixDir(full)
      continue
    }
    if (!/\.(mjs|js|cjs|json)$/.test(entry.name)) continue
    const src = await readFile(full, 'utf8')
    // Replace backslash-escaped paths like '\var\task\...' with '/var/task/...'
    const out = src.replace(/(?<=['"`])\\var\\task\\/g, '/var/task/')
                   .replace(/(?<=\/var\/task\/[^'"`]*)\\(?=[^'"`]*['"`])/g, '/')
                   .replace(/\\\\var\\\\task\\\\/g, '/var/task/')
                   .replace(/(?<=\/var\/task\/[^'"`]*)\\\\(?=[^'"`]*['"`])/g, '/')
    if (out !== src) {
      await writeFile(full, out)
      fixed++
      console.log(`  Fixed paths in: ${full}`)
    }
  }
  return fixed
}

console.log('Fixing Windows paths in Netlify handler files...')
let total = 0
for (const dir of DIRS) {
  total += await fixDir(dir)
}
console.log(`Done. Fixed ${total} file(s).`)
