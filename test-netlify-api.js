const https = require('https')

const TOKEN = 'nfc_9H7zo93ur9tnrTdDSVVVPscL6KPDVKPxfba8'
const SITE_ID = '77f644a3-34b3-4a34-9a73-3d4eb8d59050'

const options = {
  hostname: 'api.netlify.com',
  path: `/api/v1/sites/${SITE_ID}`,
  method: 'GET',
  headers: { 'Authorization': `Bearer ${TOKEN}` }
}

const req = https.request(options, (res) => {
  let data = ''
  res.on('data', (chunk) => data += chunk)
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode)
    const parsed = JSON.parse(data)
    console.log('Site name:', parsed.name)
    console.log('Site URL:', parsed.ssl_url)
  })
})

req.on('error', (e) => {
  console.error('Request error code:', e.code)
  console.error('Request error:', e.message)
  console.error('Full error:', JSON.stringify(e, Object.getOwnPropertyNames(e)))
})

req.setTimeout(15000, () => {
  console.error('Request timed out')
  req.destroy()
})

req.end()
