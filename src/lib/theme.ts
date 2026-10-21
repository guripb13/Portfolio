import { useSyncExternalStore } from 'react'

export type Theme = 'dark' | 'light'
const KEY = 'theme'
const META_COLOR: Record<Theme, string> = { dark: '#05060d', light: '#eef2fb' }

const read = (): Theme =>
  typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'

let theme: Theme = read() // index.html already set data-theme before React started
const listeners = new Set<() => void>()

export const getTheme = () => theme

export const setTheme = (next: Theme) => {
  if (next === theme) return
  theme = next
  const root = document.documentElement

  // Short colour cross-fade (skipped for people who prefer reduced motion)
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('theme-switching')
    window.setTimeout(() => root.classList.remove('theme-switching'), 450)
  }

  root.setAttribute('data-theme', next)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLOR[next])
  try { localStorage.setItem(KEY, next) } catch { /* private mode: choice just won't persist */ }
  listeners.forEach((cb) => cb())
}

export const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light')

export const subscribeTheme = (cb: () => void) => {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

export const useTheme = (): Theme => useSyncExternalStore(subscribeTheme, getTheme, () => 'dark' as Theme)
