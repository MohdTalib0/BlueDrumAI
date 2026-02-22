import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface WordRotateProps {
  words: string[]
  duration?: number
  className?: string
}

export function WordRotate({ words, duration = 2500, className = '' }: WordRotateProps) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length)
    }, duration)
    return () => clearInterval(interval)
  }, [words.length, duration])

  return (
    <span className={`inline-flex overflow-hidden ${className}`} style={{ verticalAlign: 'bottom' }}>
      <AnimatePresence mode="wait">
        <motion.span
          key={words[index]}
          className="animate-gradient-text bg-gradient-to-r from-primary-600 via-blue-500 to-indigo-600"
          initial={{ y: 30, opacity: 0, filter: 'blur(4px)' }}
          animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
          exit={{ y: -30, opacity: 0, filter: 'blur(4px)' }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
