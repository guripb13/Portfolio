import { useSyncExternalStore } from 'react'

let lite = false
const listeners = new Set<() => void>()

export const getLite = () => lite

export const toggleLite = () => {
  lite = !lite
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('lite-mode', lite)
  }
  listeners.forEach((cb) => cb())
}

export const setLite = (value: boolean) => {
  if (lite === value) return
  lite = value
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('lite-mode', lite)
  }
  listeners.forEach((cb) => cb())
}

export const subscribeLite = (cb: () => void) => {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export const useLiteMode = () => {
  return useSyncExternalStore(subscribeLite, getLite, () => false)
}
