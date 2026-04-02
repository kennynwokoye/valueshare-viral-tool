/**
 * Purge Netlify CDN cache after deploy.
 * Run this after every `netlify deploy --no-build` to clear stale CSS/JS chunks.
 * Usage: node purge-cache.js
 */
const https = require('https')
const fs = require('fs')
const path = require('path')

const SITE_ID = '77f644a3-34b3-4a34-9a73-3d4eb8d59050'

function getToken() {
  if (process.env.NETLIFY_AUTH_TOKEN) return process.env.NETLIFY_AUTH_TOKEN
  const configPaths = [
    path.join(process.env.APPDATA || '', 'netlify', 'Config', 'config.json'),
    path.join(process.env.HOME || '', '.config', 'netlify', 'config.json'),
    path.join(process.env.HOME || '', '.netlify', 'config.json'),
  ]
  for (const p of configPaths) {
    try {
      const cfg = JSON.parse(fs.readFileSync(p, 'utf8'))
      const userId = cfg.userId
      if (userId && cfg.users?.[userId]?.auth?.token) return cfg.users[userId].auth.token
    } catch { /* skip */ }
  }
  return null
}

function apiRequest(token, method, path, data) {
  return new Promise((resolve, reject) => {
    const body = data ? JSON.stringify(data) : null
    const req = https.request({
      hostname: 'api.netlify.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
      },
    }, (res) => {
      let resp = ''
      res.on('data', d => { resp += d })
      res.on('end', () => resolve({ status: res.statusCode, body: resp }))
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

async function purge() {
  const token = getToken()
  if (!token) {
    console.log('Skipping CDN cache purge — no auth token found.')
    return
  }

  // Purge the Netlify CDN cache (Edge + Durable) for the entire site.
  // Passing both site_id and domain ensures both layers are targeted.
  // Note: the permanent fix is Netlify-CDN-Cache-Control: no-store in next.config.ts
  // which prevents HTML from ever entering the Durable Cache. This purge clears any
  // stale entries that accumulated before that fix was in place.
  console.log('Purging Netlify CDN cache (Edge + Durable)...')
  // Purge both the netlify subdomain and the custom domain
  const domains = ['valueshare.netlify.app', 'valueshare.co']
  for (const domain of domains) {
    const result = await apiRequest(token, 'POST', '/api/v1/purge', {
      site_id: SITE_ID,
      domain,
    })
    if (result.status >= 200 && result.status < 300) {
      console.log(`  ✓ Purged ${domain}`)
    } else {
      throw new Error(`Cache purge for ${domain} returned ${result.status}: ${result.body}`)
    }
  }
  console.log('CDN cache purged successfully.')
}

purge().catch(err => console.error('Cache purge failed:', err.message))
