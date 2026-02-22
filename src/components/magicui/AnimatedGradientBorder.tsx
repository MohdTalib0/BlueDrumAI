import type { ReactNode } from 'react'

interface AnimatedGradientBorderProps {
  children: ReactNode
  className?: string
  containerClassName?: string
}

export function AnimatedGradientBorder({
  children,
  className = '',
  containerClassName = '',
}: AnimatedGradientBorderProps) {
  return (
    <div className={`relative rounded-2xl p-[2px] overflow-hidden ${containerClassName}`}>
      <div className="absolute inset-0 animate-border-spin rounded-2xl bg-[conic-gradient(from_0deg,#2563eb,#7c3aed,#ec4899,#f59e0b,#2563eb)]" />
      <div className={`relative rounded-[14px] bg-white ${className}`}>{children}</div>
    </div>
  )
}
