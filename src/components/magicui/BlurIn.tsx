import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface BlurInProps {
  children: ReactNode
  className?: string
  delay?: number
  duration?: number
}

export function BlurIn({ children, className = '', delay = 0, duration = 0.6 }: BlurInProps) {
  return (
    <motion.div
      initial={{ filter: 'blur(12px)', opacity: 0, y: 10 }}
      animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
