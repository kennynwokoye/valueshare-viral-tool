/**
 * Direct Netlify deploy using Node.js https module.
 * Uploads the pre-built .netlify output to Netlify via REST API.
 */
const https = require('https')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { execSync } = require('child_process')

const TOKEN = 'nfc_9H7zo93ur9tnrTdDSVVVPscL6KPDVKPxfba8'
const SITE_ID = '77f644a3-34b3-4a34-9a73-3d4eb8d59050'

function apiRequest(method, apiPath, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null
    const options = {
      hostname: 'api.netlify.com',
      path: `/api/v1${apiPath}`,
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
        ...extraHeaders,
      },
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (c) => data += c)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode, data }) }
      })
    })
    req.on('error', reject)
    req.setTimeout(60000, () => { req.destroy(new Error('timeout')) })
    if (bodyStr) req.write(bodyStr)
    req.end()
  })
}

function uploadFile(deployId, filePath, fileContent) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.netlify.com',
      path: `/api/v1/deploys/${deployId}/files${filePath}`,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileContent.length,
      },
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (c) => data += c)
      res.on('end', () => resolve({ status: res.statusCode }))
    })
    req.on('error', reject)
    req.setTimeout(120000, () => { req.destroy(new Error('upload timeout')) })
    req.write(fileContent)
    req.end()
  })
}

function sha1(content) {
  return crypto.createHash('sha1').update(content).digest('hex')
}

function collectFiles(dir, baseDir = dir) {
  const files = {}
  if (!fs.existsSync(dir)) return files
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      Object.assign(files, collectFiles(fullPath, baseDir))
    } else {
      const relPath = '/' + path.relative(baseDir, fullPath).replace(/\\/g, '/')
      const content = fs.readFileSync(fullPath)
      files[relPath] = { content, sha1: sha1(content) }
    }
  }
  return files
}

async function deploy() {
  console.log('Collecting static files from .next/static...')
  const staticFiles = collectFiles(
    path.join(__dirname, '.next', 'static'),
    path.join(__dirname, '.next', 'static')
  )

  // Build the file digest map with /_next/static prefix
  const fileMap = {}
  for (const [relPath, { sha1: s }] of Object.entries(staticFiles)) {
    fileMap[`/_next/static${relPath}`] = s
  }

  // Also include public directory files
  const publicDir = path.join(__dirname, 'public')
  if (fs.existsSync(publicDir)) {
    const publicFiles = collectFiles(publicDir, publicDir)
    for (const [relPath, { sha1: s }] of Object.entries(publicFiles)) {
      fileMap[relPath] = s
    }
  }

  console.log(`Total static files: ${Object.keys(fileMap).length}`)
  console.log('Creating deploy...')

  const deployRes = await apiRequest('POST', `/sites/${SITE_ID}/deploys`, {
    files: fileMap,
    async: false,
  })

  if (deployRes.status !== 200 && deployRes.status !== 201) {
    console.error('Failed to create deploy:', deployRes.status, JSON.stringify(deployRes.data).slice(0, 500))
    process.exit(1)
  }

  const deploy = deployRes.data
  console.log('Deploy created:', deploy.id)
  console.log('Deploy state:', deploy.state)
  console.log('Required files:', deploy.required?.length ?? 0)

  if (deploy.required && deploy.required.length > 0) {
    console.log('Uploading required files...')
    let uploaded = 0

    // Build sha1 -> { path, content } map
    const sha1Map = {}
    for (const [relPath, { content, sha1: s }] of Object.entries(staticFiles)) {
      sha1Map[s] = { netlifyPath: `/_next/static${relPath}`, content }
    }
    if (fs.existsSync(publicDir)) {
      const publicFiles = collectFiles(publicDir, publicDir)
      for (const [relPath, { content, sha1: s }] of Object.entries(publicFiles)) {
        sha1Map[s] = { netlifyPath: relPath, content }
      }
    }

    for (const requiredSha of deploy.required) {
      const entry = sha1Map[requiredSha]
      if (!entry) {
        console.warn('  Unknown required sha:', requiredSha)
        continue
      }
      const res = await uploadFile(deploy.id, entry.netlifyPath, entry.content)
      uploaded++
      if (uploaded % 50 === 0) console.log(`  Uploaded ${uploaded}/${deploy.required.length}`)
    }
    console.log(`  Uploaded ${uploaded} files`)
  }

  console.log('\nDeploy submitted!')
  console.log('Deploy URL:', deploy.deploy_ssl_url)
  console.log('Admin URL:', `https://app.netlify.com/projects/valueshare/deploys/${deploy.id}`)
  console.log('\nNote: Server-side functions require the Netlify CLI plugin to process.')
  console.log('This deploy includes static assets only. For full SSR, use the Netlify dashboard to trigger a build from git, or retry the CLI when network allows.')
}

deploy().catch(console.error)
