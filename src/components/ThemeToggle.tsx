import { useEffect, useState } from 'react'
import { useTheme, toggleTheme, THEME_FX_MS } from '../lib/theme'

interface ThemeToggleProps {
  className?: string
  compact?: boolean
}

export default function ThemeToggle({ className = '', compact = false }: ThemeToggleProps) {
  const theme = useTheme()
  const isDark = theme === 'dark'

  // The icon + label swap when the blur is at its peak, so the change happens "inside" the blur
  const [shownTheme, setShownTheme] = useState(theme)
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const id = window.setTimeout(() => setShownTheme(theme), reduced ? 0 : THEME_FX_MS / 2)
    return () => window.clearTimeout(id)
  }, [theme])
  const shownDark = shownTheme === 'dark'

  return (
    <button
      type="button"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      aria-pressed={!isDark}
      data-magnetic
      data-theme-toggle
      onClick={toggleTheme}
      className={`hero-fade btn btn-ghost pointer-events-auto backdrop-blur-md items-center gap-2 border border-white/15 hover:border-white/30 ${className}`}
    >
      <span className="relative flex items-center justify-center size-4" aria-hidden="true">
        {shownDark ? (
          // Moon icon
          <svg
            className="size-3.5 text-neon-soft transition-transform duration-300"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          // Sun icon
          <svg
            className="size-3.5 text-amber-500 transition-transform duration-300 rotate-90"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="5" fill="currentColor" fillOpacity="0.2" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        )}
      </span>
      <span className="font-medium tracking-wide">
        {compact ? (shownDark ? 'Dark' : 'Light') : (shownDark ? 'Theme: Dark' : 'Theme: Light')}
      </span>
    </button>
  )
}