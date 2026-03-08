const https = require('https')

function get(url, path) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: url,
      path,
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Encoding': 'identity',
        'User-Agent': 'Mozilla/5.0 check-script'
      }
    }
    const req = https.request(opts, res => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: d }))
    })
    req.on('error', reject)
    req.setTimeout(20000, () => reject(new Error('timeout')))
    req.end()
  })
}

async function main() {
  const host = 'valueshare.netlify.app'

  // Test a few routes
  for (const path of ['/', '/auth/login', '/api/dashboard/creator']) {
    try {
      const r = await get(host, path)
      console.log(`${path}: HTTP ${r.status}`)
      if (r.status >= 500) {
        // Show error content
        const title = r.body.match(/<title>(.*?)<\/title>/)?.[1] || '(no title)'
        console.log(`  Title: ${title}`)
        console.log(`  Body preview: ${r.body.slice(0, 300).replace(/\n/g, ' ')}`)
      } else if (r.status === 200) {
        const hasCss = r.body.includes('/_next/static/')
        const title = r.body.match(/<title>(.*?)<\/title>/)?.[1] || '(no title)'
        console.log(`  Title: ${title}`)
        console.log(`  Has Next.js chunks: ${hasCss}`)
      }
    } catch (e) {
      console.log(`${path}: ERROR - ${e.message}`)
    }
  }
}

main().catch(console.error)
