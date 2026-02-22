import type { ReactNode } from 'react'

interface MarqueeProps {
  children: ReactNode
  className?: string
  reverse?: boolean
  pauseOnHover?: boolean
  speed?: number
}

export function Marquee({
  children,
  className = '',
  reverse = false,
  pauseOnHover = false,
  speed = 40,
}: MarqueeProps) {
  return (
    <div
      className={`group flex overflow-hidden [--gap:1rem] ${className}`}
      style={{ '--duration': `${speed}s` } as React.CSSProperties}
    >
      {[0, 1].map((i) => (
        <div
          key={i}
          className={`flex shrink-0 items-center justify-around gap-[var(--gap)] ${
            reverse ? 'animate-marquee-reverse' : 'animate-marquee'
          } ${pauseOnHover ? 'group-hover:[animation-play-state:paused]' : ''}`}
        >
          {children}
        </div>
      ))}
    </div>
  )
}
