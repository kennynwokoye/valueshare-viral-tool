'use client'

interface OtpInputProps {
  value: string[]
  onChange: (value: string[]) => void
  disabled?: boolean
  className?: string
  cellClassName?: string
}

export default function OtpInput({
  value,
  onChange,
  disabled,
  className = 'auth-otp-row',
  cellClassName = 'otp-cell',
}: OtpInputProps) {
  function handleChange(index: number, v: string) {
    if (v && !/^\d$/.test(v)) return
    const next = [...value]
    next[index] = v
    onChange(next)
    if (v && index < 5) {
      document.getElementById('otp-' + (index + 1))?.focus()
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      document.getElementById('otp-' + (index - 1))?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('')
    const next = [...value]
    digits.forEach((d, i) => { next[i] = d })
    onChange(next)
    const last = Math.min(digits.length, 6) - 1
    if (last >= 0) document.getElementById('otp-' + last)?.focus()
  }

  return (
    <div className={className} onPaste={handlePaste}>
      {value.map((digit, i) => (
        <input
          key={i}
          id={`otp-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          className={`${cellClassName}${digit ? ' filled' : ''}`}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          autoFocus={i === 0}
          disabled={disabled}
        />
      ))}
    </div>
  )
}
