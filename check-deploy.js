const https = require('https')

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.netlify.com',
      path,
      method: 'GET',
      headers: { 'Authorization': 'Bearer nfc_9H7zo93ur9tnrTdDSVVVPscL6KPDVKPxfba8' }
    }
    const req = https.request(opts, res => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => {
        try { resolve(JSON.parse(d)) } catch { resolve(d) }
      })
    })
    req.on('error', reject)
    req.setTimeout(15000, () => reject(new Error('timeout')))
    req.end()
  })
}

async function main() {
  const deploys = await apiGet('/api/v1/sites/77f644a3-34b3-4a34-9a73-3d4eb8d59050/deploys?per_page=3')
  if (!Array.isArray(deploys)) { console.log('Response:', JSON.stringify(deploys).slice(0, 500)); return }

  for (const d of deploys) {
    console.log('---')
    console.log('Deploy:', d.id)
    console.log('State:', d.state)
    console.log('Created:', d.created_at)
    console.log('Error:', d.error_message || 'none')
    console.log('Functions:', d.available_functions?.length ?? 'n/a')
  }

  // Check function logs via a simple test request
  console.log('\n--- Testing live site ---')
}

main().catch(console.error)
