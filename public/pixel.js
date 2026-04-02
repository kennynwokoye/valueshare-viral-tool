/* ValueShare Conversion Pixel v1.1
 * Paste on your thank-you / confirmation page to track conversions.
 * Works across any website: Webflow, WordPress, Carrd, custom HTML.
 *
 * Usage:
 *   <script src="https://valueshare.co/pixel.js"></script>
 *
 * Two-page mode (optional):
 *   Registration page: <script src="https://valueshare.co/pixel.js" data-mode="landing"></script>
 *   Thank-you page:    <script src="https://valueshare.co/pixel.js" data-mode="conversion"></script>
 *
 * How it works:
 *   1. Reads vs_ref from the URL query string (added automatically by ValueShare)
 *   2. Stores vs_ref in localStorage for multi-page funnels
 *   3. Fires a silent beacon to ValueShare — no redirect, no popup
 *   4. Deduplicates: only fires once per vs_ref per 24 hours
 */
;(function () {
  'use strict'
  try {
    // Detect data-mode from the script tag
    var scripts = document.getElementsByTagName('script')
    var currentScript = scripts[scripts.length - 1]
    var mode = currentScript && currentScript.getAttribute('data-mode') // 'landing' | 'conversion' | null

    var params = new URLSearchParams(window.location.search)
    var ref = params.get('vs_ref')

    // Fall back to localStorage for multi-step funnels
    if (!ref) {
      try { ref = localStorage.getItem('_vs_ref') } catch (e) { /* ignore */ }
    }

    if (!ref) return

    // Persist for multi-page funnels
    try { localStorage.setItem('_vs_ref', ref) } catch (e) { /* ignore */ }

    // In "landing" mode, only store vs_ref — don't fire the conversion beacon
    if (mode === 'landing') return

    // Client-side dedup: skip if already fired for this ref within 24h
    var dedupKey = '_vs_fired_' + ref
    try {
      var firedAt = localStorage.getItem(dedupKey)
      if (firedAt && (Date.now() - Number(firedAt)) < 86400000) return
    } catch (e) { /* ignore */ }

    // Fire beacon via Image tag (no CORS, no preflight, universally supported)
    var host = 'https://valueshare.co'
    var url = host + '/api/conversion?ref=' + encodeURIComponent(ref) + '&event=conversion&_=' + Date.now()
    var img = new Image(1, 1)
    img.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;display:none'
    img.src = url

    // Mark as fired for dedup
    try { localStorage.setItem(dedupKey, String(Date.now())) } catch (e) { /* ignore */ }

    // Append to DOM when ready (ensures browser fires the request)
    function append() {
      if (document.body) {
        document.body.appendChild(img)
      }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', append)
    } else {
      append()
    }
  } catch (e) {
    // Pixel must never throw or break the host page
  }
})()
