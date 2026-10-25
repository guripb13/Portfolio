import { useSyncExternalStore } from 'react'

export type Theme = 'dark' | 'light'

/** Browser address-bar colour for each theme (kept in sync with index.html). */
const META_COLOR: Record<Theme, string> = { dark: '#05060d', light: '#eef2fb' }

/*
 * One duration drives everything: full-screen blur, colour fade and the toggle's icon swap.
 * It is also written to CSS as --theme-ms so JS and CSS never drift apart.
 */
export const THEME_FX_MS = 300
export const THEME_VT_MS = 650

let fxTimer = 0

/** Reads the theme that index.html already applied before React started. */
const read = (): Theme =>
  typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light'
    ? 'light'
    : 'dark'

let theme: Theme = read()
const listeners = new Set<() => void>()

export const getTheme = () => theme

export const setTheme = (next: Theme) => {
  if (next === theme) return
  theme = next

  const root = document.documentElement
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  /** The actual theme change (runs once the browser has captured the "before" snapshot). */
  const apply = () => {
    root.setAttribute('data-theme', next)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLOR[next])
    listeners.forEach((cb) => cb())
  }

  // Best path: View Transitions. The browser snapshots the old page, applies the new theme,
  // then cross-fades the two on the GPU, so gradients, canvas and glass all fade together.
  const start = (document as Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<unknown> }
  }).startViewTransition

  if (!reduced && typeof start === 'function') {
    root.style.setProperty('--theme-vt-ms', `${THEME_VT_MS}ms`)
    root.classList.add('theme-vt') // switches off the per-element fallback transitions
    const vt = start.call(document, apply)
    vt.finished.finally(() => root.classList.remove('theme-vt'))
    return
  }

  // Fallback (older browsers): full-screen blur + colour cross-fade (skipped for reduced motion).
  if (!reduced) {
    window.clearTimeout(fxTimer)
    root.classList.remove('theme-switching')
    void root.offsetHeight // force a reflow so the animation restarts if toggled quickly
    root.style.setProperty('--theme-ms', `${THEME_FX_MS}ms`)
    root.classList.add('theme-switching')
    fxTimer = window.setTimeout(() => root.classList.remove('theme-switching'), THEME_FX_MS + 100)
  }
  apply()
}

export const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light')

export const subscribeTheme = (cb: () => void) => {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export const useTheme = (): Theme =>
  useSyncExternalStore(subscribeTheme, getTheme, () => 'dark' as Theme)

/* Follow the device's light/dark setting live (the toggle button still works until the next change). */
if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    setTheme(e.matches ? 'dark' : 'light')
  })
}