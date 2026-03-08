'use client'

import { useState, useEffect } from 'react'

function calcRemaining(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now()
  if (diff <= 0) return null
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

export default function CountdownTimer({ deadline }: { deadline: string }) {
  const [remaining, setRemaining] = useState(calcRemaining(deadline))

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(calcRemaining(deadline))
    }, 1000)
    return () => clearInterval(id)
  }, [deadline])

  if (!remaining) {
    return (
      <div className="cl-countdown cl-countdown-ended">
        <span>&#x23F0;</span> This campaign has ended
      </div>
    )
  }

  return (
    <div className="cl-countdown">
      <div className="cl-countdown-label">
        &#x23F0; Campaign ends in
      </div>
      <div className="cl-countdown-boxes">
        <div className="cl-countdown-box">
          <div className="cl-countdown-num">{remaining.days}</div>
          <div className="cl-countdown-unit">days</div>
        </div>
        <div className="cl-countdown-sep">:</div>
        <div className="cl-countdown-box">
          <div className="cl-countdown-num">{remaining.hours}</div>
          <div className="cl-countdown-unit">hours</div>
        </div>
        <div className="cl-countdown-sep">:</div>
        <div className="cl-countdown-box">
          <div className="cl-countdown-num">{remaining.minutes}</div>
          <div className="cl-countdown-unit">min</div>
        </div>
        <div className="cl-countdown-sep">:</div>
        <div className="cl-countdown-box">
          <div className="cl-countdown-num">{remaining.seconds}</div>
          <div className="cl-countdown-unit">sec</div>
        </div>
      </div>
    </div>
  )
}
