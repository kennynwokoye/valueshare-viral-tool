export default function Loading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--vs-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Logo */}
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '20px',
          fontWeight: 800,
          letterSpacing: '-0.02em',
        }}
      >
        <span style={{ color: 'var(--vs-text)' }}>Value</span>
        <span style={{ color: 'var(--vs-accent)' }}>Share</span>
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--vs-accent)',
              animation: `pulse-glow 1.2s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
              opacity: 0.6,
            }}
          />
        ))}
      </div>

      {/* Text */}
      <span
        style={{
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--vs-text-3)',
          letterSpacing: '0.1em',
        }}
      >
        Loading...
      </span>
    </div>
  )
}
