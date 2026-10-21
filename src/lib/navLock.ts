/** Locks nav scroll-spy / updates when jumping smoothly to a target section */
export const lockNav = (durationMs = 1800, targetId?: string) => {
  if (targetId && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('navlock', { detail: { durationMs, targetId } }))
  }
}

/** Glides smoothly to target section with the full screen blur veil animation and nav indicator sync */
export const glideTo = (id: string) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nav-glide', { detail: { id } }))
  }
}

