/**
 * deploy-all.js — Single-script deploy pipeline.
 *
 * Steps run in strict order:
 *   1. npx next build         — catches TypeScript errors (netlify build swallows them!)
 *   2. npx netlify build      — generates server handler + edge functions
 *   3. node fix-paths-post-build.js
 *   4. VALIDATE: abort if .next/_next/static/chunks/*.css missing
 *   5. npx netlify deploy --prod --no-build --skip-functions-cache
 *   6. node purge-cache.js (both domains)
 *
 * Steps 1 and 4 are safety gates that prevent deploying broken builds.
 */

const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

function run(label, cmd, args) {
  console.log(`\n${'─'.repeat(64)}\n  ${label}\n${'─'.repeat(64)}`)
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: true, cwd: __dirname })
  if (result.status !== 0) {
    console.error(`\n✗  FAILED at: ${label}`)
    process.exit(result.status || 1)
  }
}

function validateChunks() {
  console.log('\n─────────────────────────────────────────────────────────────────')
  console.log('  STEP 3/5: Validating .next/_next/ static chunks')
  console.log('─────────────────────────────────────────────────────────────────')

  const chunksDir = path.join(__dirname, '.next', '_next', 'static', 'chunks')
  if (!fs.existsSync(chunksDir)) {
    console.error('\n✗  VALIDATION FAILED')
    console.error('   .next/_next/static/chunks/ not found.')
    console.error('   fix-paths-post-build.js did not copy static assets.')
    console.error('   Deploy aborted — no CSS/JS chunks would be served.')
    process.exit(1)
  }

  const cssFiles = fs.readdirSync(chunksDir).filter(f => f.endsWith('.css'))
  if (cssFiles.length === 0) {
    console.error('\n✗  VALIDATION FAILED')
    console.error('   No .css files found in .next/_next/static/chunks/.')
    console.error('   Deploy aborted — CSS would 404 in production.')
    process.exit(1)
  }

  console.log(`\n  ✓  Found ${cssFiles.length} CSS chunk(s) — safe to deploy.`)
}

// Run next build first — catches TypeScript errors before the full netlify build.
// npx netlify build swallows TS errors and exits 0 even on compile failure.
run('STEP 1/6: next build (type-check)', 'npx', ['next', 'build'])
run('STEP 2/6: netlify build',           'npx', ['netlify', 'build'])
run('STEP 3/6: fix-paths-post-build',    'node', ['fix-paths-post-build.js'])
validateChunks()
run('STEP 5/6: netlify deploy',          'npx', ['netlify', 'deploy', '--prod', '--no-build', '--skip-functions-cache'])
run('STEP 6/6: purge CDN cache',         'node', ['purge-cache.js'])

console.log('\n✓  All done — site is live on valueshare.co\n')
