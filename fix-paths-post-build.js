const fs = require('fs')
const path = require('path')

function fixDir(dir) {
  let entries
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) }
  catch { return 0 }
  let fixed = 0
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) { fixed += fixDir(full); continue }
    if (!/\.(mjs|js|cjs)$/.test(entry.name)) continue
    const src = fs.readFileSync(full, 'utf8')
    let out = src
    // Fix double-escaped \var\task\ paths
    out = out.replace(/\\\\var\\\\task\\\\/g, '/var/task/')
    // Fix single-escaped \var\task\ paths
    out = out.replace(/\\var\\task\\/g, '/var/task/')
    // Fix remaining double backslashes in /var/task/ paths (5 passes)
    for (let i = 0; i < 5; i++) {
      out = out.replace(/(\/var\/task\/[^'"`\n]*?)\\\\([^'"`\n]*?)/g, (m, p1, p2) => p1 + '/' + p2)
    }
    // Fix remaining single backslashes in /var/task/ paths (5 passes)
    for (let i = 0; i < 5; i++) {
      out = out.replace(/(\/var\/task\/[^'"`\n]*?)\\([^'"`\n]*?)/g, (m, p1, p2) => p1 + '/' + p2)
    }
    if (out !== src) {
      fs.writeFileSync(full, out)
      fixed++
      console.log('  Fixed:', full)
    }
  }
  return fixed
}

// --- Step 1: Fix Windows backslash paths in handler files ---
console.log('Step 1: Fixing Windows paths in Netlify build output...')
const dirs = [
  path.join('.netlify', 'functions-internal'),
  path.join('.netlify', 'dist'),
]
let total = 0
for (const dir of dirs) { total += fixDir(dir) }
console.log('  Fixed', total, 'file(s)')

// --- Step 2: Copy .netlify/static/ into .next/ publish dir ---
// The @netlify/plugin-nextjs puts static assets in .netlify/static/_next/
// which should be merged into CDN automatically, but this doesn't work
// for local deploys. We copy them into the publish dir (.next/) instead.
function copyDirSync(src, dest) {
  let copied = 0
  try { fs.mkdirSync(dest, { recursive: true }) } catch {}
  let entries
  try { entries = fs.readdirSync(src, { withFileTypes: true }) }
  catch { return 0 }
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copied += copyDirSync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
      copied++
    }
  }
  return copied
}

const staticSrc = path.join('.netlify', 'static')
const publishDir = '.next'
console.log('Step 2: Merging .netlify/static/ into publish dir...')
try {
  const copied = copyDirSync(staticSrc, publishDir)
  console.log('  Copied', copied, 'static file(s)')
} catch (e) {
  console.log('  No .netlify/static/ found, skipping')
}

// --- Step 3: Write _headers file to publish dir with explicit Content-Type ---
// This ensures CSS/JS files are ALWAYS served with the correct MIME type,
// even if requests are routed through the Next.js Lambda function.
console.log('Step 3: Writing _headers file to publish dir...')
const headersContent = `# Explicit MIME types for Next.js static chunks
/_next/static/css/*
  Content-Type: text/css; charset=utf-8
  Cache-Control: public, max-age=31536000, immutable

/_next/static/chunks/*.css
  Content-Type: text/css; charset=utf-8
  Cache-Control: public, max-age=31536000, immutable

/_next/static/chunks/*.js
  Content-Type: application/javascript; charset=utf-8
  Cache-Control: public, max-age=31536000, immutable

/_next/static/media/*
  Cache-Control: public, max-age=31536000, immutable

/*
  X-Content-Type-Options: nosniff
`
fs.writeFileSync(path.join(publishDir, '_headers'), headersContent)
console.log('  Written: .next/_headers')
