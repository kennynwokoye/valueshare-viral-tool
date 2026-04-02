/**
 * strip-html-durable.js — Netlify Edge Function
 *
 * Why this exists:
 * @netlify/plugin-nextjs sets `netlify-cdn-cache-control: max-age=31536000, durable`
 * on ALL prerendered/cached HTML responses. The `durable` directive stores the HTML
 * in Netlify's Durable Cache with a ~1-year TTL that SURVIVES across deploys.
 *
 * After a new deploy, CSS/JS chunk hashes change. The Durable Cache still serves the
 * OLD HTML (with old hash references). The old CSS files no longer exist → 404 →
 * served as text/plain → browser refuses them → page unstyled.
 *
 * The plugin sets `durable` unconditionally when `x-nextjs-cache` header is present
 * (which it always is for ISR/static pages), ignoring any `Netlify-CDN-Cache-Control`
 * header we set in next.config.ts. We cannot prevent the plugin from doing this.
 *
 * Fix: This edge function runs AFTER the server handler and strips `durable` from
 * `netlify-cdn-cache-control` on HTML responses. Without `durable`, the CDN uses the
 * normal Edge Cache (short TTL, purged on deploy) instead of the Durable Cache.
 * Static assets (CSS/JS/_next/static) are excluded — they SHOULD be immutably cached.
 */
export default async function handler(request, context) {
  const response = await context.next()

  // Only strip durable from HTML pages, not static assets
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('text/html')) {
    return response
  }

  const cdn = response.headers.get('netlify-cdn-cache-control') ?? ''
  if (!cdn.includes('durable')) {
    return response
  }

  // Strip the 'durable' directive, keep the rest (e.g. s-maxage, stale-while-revalidate)
  const stripped = cdn
    .split(',')
    .map(s => s.trim())
    .filter(s => s.toLowerCase() !== 'durable')
    .join(', ') || 'no-store'

  // Create a new response with modified headers (headers may be immutable on the original)
  const headers = new Headers(response.headers)
  headers.set('netlify-cdn-cache-control', stripped)

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export const config = {
  path: '/*',
  excludedPath: ['/_next/*', '/favicon.ico'],
}
