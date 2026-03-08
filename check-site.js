const https = require('https')

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Accept-Encoding': 'identity', 'Accept': 'text/html' } }, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }))
    }).on('error', reject)
  })
}

async function main() {
  try {
    const res = await get('https://valueshare.netlify.app/')
    console.log('Status:', res.status)
    console.log('Content-Type:', res.headers['content-type'])
    console.log('HTML length:', res.data.length)

    const css = [...res.data.matchAll(/href="(\/_next\/static\/[^"]+\.css)"/g)].map(m => m[1])
    const js = [...res.data.matchAll(/src="(\/_next\/static\/chunks\/[^"]+\.js)"/g)].map(m => m[1])

    console.log('\nCSS chunks:', css)
    console.log('\nJS chunks (first 5):', js.slice(0, 5))

    // Check if a CSS file is accessible
    if (css.length > 0) {
      const cssRes = await get('https://valueshare.netlify.app' + css[0])
      console.log('\nCSS file status:', cssRes.status, 'Size:', cssRes.data.length)
    } else {
      console.log('\nNo CSS link tags found in HTML')
      // Show the head tag
      const headMatch = res.data.match(/<head>([\s\S]*?)<\/head>/)
      if (headMatch) console.log('HEAD content:\n', headMatch[1].slice(0, 1000))
    }
  } catch (e) {
    console.error('Error:', e.message)
  }
}

main()
