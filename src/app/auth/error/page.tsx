import Link from 'next/link'

const ERROR_MAP: Record<
  string,
  { title: string; description: string; action: string; href: string }
> = {
  exchange_failed: {
    title: 'Link expired',
    description: 'This login link has expired or already been used.',
    action: 'Get a new link',
    href: '/auth/join',
  },
  access_denied: {
    title: 'Access denied',
    description: "You don't have permission to access this.",
    action: 'Go home',
    href: '/',
  },
}

const DEFAULT_ERROR = {
  title: 'Authentication failed',
  description: 'Something went wrong. Please try again.',
  action: 'Try again',
  href: '/auth/login',
}

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; description?: string }>
}) {
  const params = await searchParams
  const errorInfo = ERROR_MAP[params.error || ''] || DEFAULT_ERROR

  return (
    <div
      style={{
        background: 'var(--vs-surface)',
        border: '1px solid var(--vs-border)',
        borderRadius: '12px',
        padding: '40px',
        textAlign: 'center',
      }}
    >
      <div
        className="animate-fade-up"
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(255,71,87,0.08)',
          border: '1px solid rgba(255,71,87,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: '24px',
        }}
      >
        &#9888;
      </div>
      <h2
        className="animate-fade-up-1"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '24px',
          fontWeight: 700,
          color: 'var(--vs-text)',
          margin: '0 0 10px 0',
          letterSpacing: '-0.02em',
        }}
      >
        {errorInfo.title}
      </h2>
      <p
        className="animate-fade-up-2"
        style={{
          fontSize: '13px',
          color: 'var(--vs-text-2)',
          margin: '0 0 24px 0',
          lineHeight: '1.6',
        }}
      >
        {params.description || errorInfo.description}
      </p>
      <div className="animate-fade-up-3">
        <Link
          href={errorInfo.href}
          className="vs-btn vs-btn-primary"
          style={{
            display: 'inline-flex',
            padding: '14px 24px',
            textDecoration: 'none',
          }}
        >
          {errorInfo.action} &rarr;
        </Link>
      </div>
    </div>
  )
}
