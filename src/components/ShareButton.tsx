import { useEffect, useRef, useState } from 'react'
import { resume } from '../data/resume'

/** Copies text to the clipboard. Uses the modern API, with an old-browser fallback. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to the legacy method */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

/**
 * Share button (used on the home screen AND in the top bar, on desktop, tablet and phone):
 *  - Phones / tablets (touch screens): opens the device's native share menu (WhatsApp, Messages, Gmail, ...).
 *  - Desktop (mouse): copies the portfolio link to the clipboard and shows "Link copied".
 *  - Any failure of the share menu falls back to copying the link.
 *
 * The text label carries the "font-medium" class so that, when used with the "hdr-btn" class,
 * it collapses into a round icon-only button (same as the top bar's Theme button).
 *
 * NOTE: Do NOT add transform/transition classes (e.g. transition-transform, active:scale-*)
 * to this button. The "data-magnetic" effect drives the transform from JavaScript, and a CSS
 * transition on top of it makes the movement feel laggy/sticky.
 */
export default function ShareButton({ className = '' }: { className?: string }) {
  const [status, setStatus] = useState<'idle' | 'sharing' | 'copied' | 'failed'>('idle')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const flash = (s: 'copied' | 'failed') => {
    setStatus(s)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setStatus('idle'), 2200)
  }

  const copy = async (url: string) => flash((await copyText(url)) ? 'copied' : 'failed')

  const onShare = async () => {
    // The portfolio link, without any #section hash
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}`
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches

    if (isTouchDevice && typeof navigator.share === 'function') {
      // Instant feedback: the tick appears the moment the button is tapped, while the share menu is still opening
      setStatus('sharing')
      window.clearTimeout(timer.current)
      try {
        await navigator.share({
          title: `${resume.name} | Portfolio`,
          text: `Check out ${resume.name}'s portfolio`,
          url,
        })
      } catch (err) {
        // Closing the share menu is not an error. Anything else: copy the link instead.
        if ((err as DOMException)?.name !== 'AbortError') {
          await copy(url)
          return
        }
      }
      // Share menu was used or closed: keep the tick for a moment, then go back to "Share"
      timer.current = window.setTimeout(() => setStatus('idle'), 1200)
      return
    }

    await copy(url)
  }

  return (
    <button
      type="button"
      onClick={onShare}
      data-magnetic
      aria-label="Share this portfolio"
      title="Share this portfolio"
      className={`btn btn-ghost items-center gap-2 border border-white/15 hover:border-white/30 ${className}`}
    >
      {status === 'idle' && (
        <>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
          </svg>
          <span className="font-medium tracking-wide">Share</span>
        </>
      )}
      {status === 'sharing' && (
        <>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
          <span className="font-medium tracking-wide">Sharing</span>
        </>
      )}
      {status === 'copied' && (
        <>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
          <span className="font-medium tracking-wide">Link copied</span>
        </>
      )}
      {status === 'failed' && (
        <>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 6v8M12 18h.01" />
          </svg>
          <span className="font-medium tracking-wide">Couldn&rsquo;t copy</span>
        </>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {status === 'sharing' ? 'Opening share menu' : status === 'copied' ? 'Portfolio link copied to clipboard' : status === 'failed' ? 'Could not copy the link' : ''}
      </span>
    </button>
  )
}
