import { useEffect, useState } from 'react'

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return true
    if (!localStorage.getItem('theme-v2')) {
      localStorage.removeItem('theme')
      localStorage.setItem('theme-v2', '1')
    }
    const stored = localStorage.getItem('theme')
    if (stored) return stored === 'dark'
    return true
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [dark])

  return { dark, toggle: () => setDark((d) => !d) }
}
