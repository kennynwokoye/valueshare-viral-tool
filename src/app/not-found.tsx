import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--vs-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}
    >
      <div style={{ textAlign: 'center', position: 'relative', maxWidth: '440px', width: '100%' }}>
        {/* Background 404 */}
        <div
          className="animate-fade-in"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '80px',
            fontWeight: 800,
            color: 'var(--vs-text)',
            opacity: 0.08,
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            letterSpacing: '-0.04em',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          404
        </div>

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1
            className="animate-fade-up-1"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '28px',
              fontWeight: 800,
              color: 'var(--vs-text)',
              margin: '0 0 10px 0',
              letterSpacing: '-0.02em',
            }}
          >
            Page not found
          </h1>
          <p
            className="animate-fade-up-2"
            style={{
              fontSize: '13px',
              color: 'var(--vs-text-2)',
              margin: '0 0 32px 0',
              lineHeight: '1.6',
            }}
          >
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <div
            className="animate-fade-up-3"
            style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}
          >
            <Link href="/" className="vs-btn vs-btn-primary" style={{ textDecoration: 'none' }}>
              Go Home
            </Link>
            <Link href="/campaign" className="vs-btn vs-btn-ghost" style={{ textDecoration: 'none' }}>
              Check a Campaign
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
