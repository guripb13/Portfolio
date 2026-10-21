import { useTheme, toggleTheme } from '../lib/theme'

interface ThemeToggleProps {
  className?: string
  compact?: boolean
}

export default function ThemeToggle({ className = '', compact = false }: ThemeToggleProps) {
  const theme = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      aria-pressed={!isDark}
      data-magnetic
      onClick={toggleTheme}
      className={`hero-fade btn btn-ghost pointer-events-auto backdrop-blur-md items-center gap-2.5 border border-white/15 hover:border-white/30 transition-all duration-300 ${className}`}
    >
      <span className="relative flex items-center justify-center size-4" aria-hidden="true">
        {isDark ? (
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
        {compact ? (isDark ? 'Dark' : 'Light') : (isDark ? 'Theme: Dark' : 'Theme: Light')}
      </span>
    </button>
  )
}
