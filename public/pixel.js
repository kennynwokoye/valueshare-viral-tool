/* ValueShare Conversion Pixel v1.0
 * Paste on your thank-you / confirmation page to track conversions.
 * Works across any website: Webflow, WordPress, Carrd, custom HTML.
 *
 * Usage:
 *   <script src="https://valueshare.co/pixel.js"></script>
 *
 * How it works:
 *   1. Reads vs_ref from the URL query string (added automatically by ValueShare)
 *   2. Stores vs_ref in localStorage for multi-page funnels
 *   3. Fires a silent beacon to ValueShare — no redirect, no popup
 */
;(function () {
  'use strict'
  try {
    var params = new URLSearchParams(window.location.search)
    var ref = params.get('vs_ref')

    // Fall back to localStorage for multi-step funnels
    if (!ref) {
      try { ref = localStorage.getItem('_vs_ref') } catch (e) { /* ignore */ }
    }

    if (!ref) return

    // Persist for multi-page funnels
    try { localStorage.setItem('_vs_ref', ref) } catch (e) { /* ignore */ }

    // Fire beacon via Image tag (no CORS, no preflight, universally supported)
    var host = 'https://valueshare.co'
    var url = host + '/api/conversion?ref=' + encodeURIComponent(ref) + '&event=conversion&_=' + Date.now()
    var img = new Image(1, 1)
    img.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;display:none'
    img.src = url

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
