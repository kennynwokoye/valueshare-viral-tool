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

async function purge() {
  const token = getToken()
  if (!token) {
    console.log('Skipping CDN cache purge — no auth token found.')
    return
  }
  console.log('Purging CDN cache...')
  await new Promise((resolve, reject) => {
    const data = JSON.stringify({ site_id: SITE_ID })
    const req = https.request({
      hostname: 'api.netlify.com',
      path: '/api/v1/purge',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let body = ''
      res.on('data', d => { body += d })
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('CDN cache purged successfully.')
          resolve()
        } else {
          reject(new Error(`Cache purge returned ${res.statusCode}: ${body}`))
        }
      })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

purge().catch(err => console.error('Cache purge failed:', err.message))
