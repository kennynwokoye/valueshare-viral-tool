// ── Social share URL builders ─────────────────────────────

type SharePlatform = 'whatsapp' | 'facebook' | 'twitter' | 'linkedin' | 'email'

interface ShareParams {
  url: string
  text: string
  subject?: string
}

export function buildShareUrl(platform: SharePlatform, params: ShareParams): string {
  const { url, text, subject } = params
  const encodedUrl = encodeURIComponent(url)
  const encodedText = encodeURIComponent(text)

  switch (platform) {
    case 'whatsapp':
      return `https://wa.me/?text=${encodeURIComponent(text + '\n\n' + url)}`

    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`

    case 'twitter':
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text + '\n\n' + url)}`

    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`

    case 'email':
      return `mailto:?subject=${encodeURIComponent(subject || 'Check this out!')}&body=${encodeURIComponent(text + '\n\n' + url)}`

    default:
      return url
  }
}
