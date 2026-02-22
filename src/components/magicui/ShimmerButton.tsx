import type { ReactNode } from 'react'

interface ShimmerButtonProps {
  children: ReactNode
  className?: string
  shimmerColor?: string
  shimmerSize?: string
  background?: string
  onClick?: () => void
}

export function ShimmerButton({
  children,
  className = '',
  shimmerColor = 'rgba(255,255,255,0.15)',
  shimmerSize = '0.1em',
  background = 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
  onClick,
}: ShimmerButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`group relative inline-flex items-center justify-center overflow-hidden rounded-xl px-8 py-4 text-base font-bold text-white shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] ${className}`}
      style={{ background }}
    >
      <div
        className="absolute inset-0 overflow-hidden rounded-xl"
        style={{ '--shimmer-color': shimmerColor, '--shimmer-size': shimmerSize } as React.CSSProperties}
      >
        <div className="shimmer-slide absolute inset-0" />
      </div>
      <span className="relative z-10 flex items-center gap-2.5">{children}</span>
    </button>
  )
}
