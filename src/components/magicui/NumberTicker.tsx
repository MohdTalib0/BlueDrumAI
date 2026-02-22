import { useEffect, useRef } from 'react'
import { useInView, useMotionValue, useSpring } from 'framer-motion'

interface NumberTickerProps {
  value: number
  direction?: 'up' | 'down'
  delay?: number
  decimals?: number
  className?: string
}

export function NumberTicker({
  value,
  direction = 'up',
  delay = 0,
  decimals = 0,
  className = '',
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(direction === 'down' ? value : 0)
  const springValue = useSpring(motionValue, { damping: 60, stiffness: 100 })
  const isInView = useInView(ref, { once: true, margin: '0px' })

  useEffect(() => {
    if (isInView) {
      const timeout = setTimeout(() => {
        motionValue.set(direction === 'down' ? 0 : value)
      }, delay * 1000)
      return () => clearTimeout(timeout)
    }
  }, [motionValue, isInView, delay, value, direction])

  useEffect(
    () =>
      springValue.on('change', (latest) => {
        if (ref.current) {
          ref.current.textContent = Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          }).format(Number(latest.toFixed(decimals)))
        }
      }),
    [springValue, decimals],
  )

  return (
    <span ref={ref} className={`inline-block tabular-nums ${className}`}>
      {direction === 'down' ? value : 0}
    </span>
  )
}
