import { useEffect, useRef, useState, type ReactNode } from 'react'
import { resume } from '../data/resume'
import GlassCard from './GlassCard'
import ProjectArt from './ProjectArt'
import ImageLightbox, { type ZoomState } from './ImageLightbox'

interface ProjectViewerProps {
  initialIndex: number | null
  isOpen: boolean
  onClose: () => void
  onContact: () => void
}

function TextScroller({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [more, setMore] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // true only while there is hidden text below the visible area
    const check = () => setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 8)
    check()
    el.addEventListener('scroll', check, { passive: true })
    const ro = new ResizeObserver(check)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => {
      el.removeEventListener('scroll', check)
      ro.disconnect()
    }
  }, [])

  const scrollDown = () => {
    const el = ref.current
    if (el) el.scrollBy({ top: el.clientHeight * 0.6, behavior: 'smooth' })
  }

  return (
    <div className="pv-text relative order-2 flex flex-col lg:order-1 lg:col-span-6 lg:min-h-0">
      <div
        ref={ref}
        className="viewer-text-scroll pv-textscroll flex flex-col lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-y-contain lg:pb-28 lg:pr-4 lg:pt-28 lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden lg:[-webkit-mask-image:linear-gradient(to_bottom,transparent_0,#000_5rem,#000_calc(100%_-_5rem),transparent_100%)] lg:[mask-image:linear-gradient(to_bottom,transparent_0,#000_5rem,#000_calc(100%_-_5rem),transparent_100%)]"
      >
        {children}
      </div>

      {/* Scroll hint: plain down arrow, visible only while more text is below */}
      <button
        type="button"
        onClick={scrollDown}
        tabIndex={more ? 0 : -1}
        aria-hidden={!more}
        aria-label="Scroll down for more"
        className={`pv-hint absolute bottom-8 left-1/2 z-10 hidden h-10 w-10 -translate-x-1/2 items-center justify-center !rounded-full bg-transparent p-0 text-neon-soft transition-all duration-300 lg:flex ${
          more ? 'translate-y-0 cursor-pointer opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
        }`}
      >
        <svg
          className="h-6 w-6 motion-safe:animate-bounce"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  )
}

/**
 * Phones turned sideways get the SAME design as a tablet in landscape:
 * text column on the left (scrolls on its own), certificate image on the right, controls bottom right.
 * (Real tablets in landscape already use this through the lg: classes; this only copies it to short, narrower screens.)
 */
const LANDSCAPE_CSS = `
@media (orientation:landscape) and (max-height:520px) and (max-width:1023px){
  .pv-header{position:absolute !important;left:0;right:0;top:0;padding:.5rem 1.25rem !important;pointer-events:none}
  .pv-cred{right:1.25rem !important;top:.5rem !important}
  .pv-panel{overflow-y:hidden !important;padding:0 1.25rem !important}
  .pv-grid{margin-top:0 !important;margin-bottom:0 !important;height:100%;grid-template-columns:repeat(12,minmax(0,1fr)) !important;grid-template-rows:minmax(0,1fr) !important;align-items:stretch !important;gap:1.5rem !important}
  .pv-text{order:1 !important;grid-column:span 6 / span 6 !important;min-height:0 !important}
  .pv-textscroll{min-height:0 !important;flex:1 1 0% !important;overflow-y:auto !important;overscroll-behavior-y:contain;padding:3.25rem .75rem 3.25rem 0 !important;scrollbar-width:none;-webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 2.75rem,#000 calc(100% - 2.75rem),transparent 100%);mask-image:linear-gradient(to bottom,transparent 0,#000 2.75rem,#000 calc(100% - 2.75rem),transparent 100%)}
  .pv-textscroll::-webkit-scrollbar{display:none}
  .pv-textinner{margin-top:auto;margin-bottom:auto}
  .pv-hint{display:flex !important;bottom:.6rem !important}
  .pv-kicker{font-size:.65rem !important}
  .pv-title{font-size:clamp(1.3rem,4.6vw,1.9rem) !important;margin-top:.3rem !important;line-height:1.15 !important}
  .pv-desc{font-size:.8rem !important;margin-top:.6rem !important;line-height:1.5 !important}
  .pv-hl{margin-top:.8rem !important}
  .pv-hl ul{font-size:.76rem !important}
  .pv-chips{margin-top:.8rem !important}
  .pv-chips li{font-size:.68rem !important;padding:.2rem .6rem !important}
  .pv-link{margin-top:1rem !important}
  .pv-visual-col{order:2 !important;grid-column:span 6 / span 6 !important;margin:0 !important;max-width:none !important;display:flex !important;flex-direction:column !important;height:100% !important;min-height:0 !important;align-items:center !important;justify-content:center !important;padding:3.25rem 0 3.5rem !important}
  .pv-visual-col .viewer-visual{aspect-ratio:16/10 !important;border-radius:1.25rem !important}
  .pv-footer{position:absolute !important;left:0;right:0;bottom:.5rem !important;padding:0 1.25rem !important}
  .pv-footer-inner{display:grid !important;grid-template-columns:repeat(12,minmax(0,1fr));gap:1.5rem}
  .pv-controls{grid-column:7 / span 6 !important}
  .viewer-controls-bar{transition:transform .5s cubic-bezier(.16,1,.3,1)}
  .viewer-controls-bar nav button{white-space:nowrap} /* keeps "← Prev" and "Next →" on one line */
  .viewer-controls-bar.is-centered{transform:translateX(calc(-50% - .75rem))}
  .pv-close{overflow-y:auto !important;padding:3.25rem 2.5rem .75rem !important} /* 2.5rem left + right keeps the conclusion card off the screen edges */
  .pv-close-card{padding:1.1rem 1.5rem !important}
  .pv-close-card h2{font-size:1.4rem !important;margin-top:.6rem !important}
  .pv-close-card p{font-size:.82rem !important;margin-top:.4rem !important;line-height:1.45 !important}
  .pv-close-card > div{margin-top:.9rem !important}
  .pv-close-card .btn{padding:.55rem 1.1rem !important;font-size:.8rem !important}
}
`

export default function ProjectViewer({ initialIndex, isOpen, onClose, onContact }: ProjectViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const panelRefs = useRef<(HTMLElement | null)[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [zoom, setZoom] = useState<ZoomState | null>(null)

  // Header buttons: icon-only after the first scroll, text returns on hover / while an image is enlarged
  const [compact, setCompact] = useState(false)
  const [hoverClose, setHoverClose] = useState(false)
  const [hoverCred, setHoverCred] = useState(false)
  const armedRef = useRef(false)           // ignores the automatic scroll that happens while opening

  const pushedRef = useRef(false)          // did we add a history entry?
  const openRef = useRef(isOpen)           // always-current isOpen
  const onCloseRef = useRef(onClose)       // always-current onClose
  const activeRef = useRef(0)              // always-current activeIdx (for the wheel handler)
  openRef.current = isOpen
  onCloseRef.current = onClose
  activeRef.current = activeIdx

  const openZoom = (p: (typeof projects)[number], idx: number, card: HTMLElement) => {
    const img = card.querySelector('img')
    if (!img || !p.image) return
    setZoom({
      idx,
      el: card,
      low: p.image,
      alt: p.title,
      ratio: img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 4 / 3,
    })
  }

  // If the whole viewer closes, drop the enlarged image
  useEffect(() => {
    if (!isOpen) setZoom(null)
  }, [isOpen])

  // Phone / browser Back button closes the viewer instead of leaving the site
  useEffect(() => {
    if (!isOpen) return

    // stop the browser from jumping the main page's scroll position when the history entry is removed
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

    if (!pushedRef.current) {
      history.pushState({ projectViewer: true }, '')
      pushedRef.current = true
    }

    const onPop = () => {
      pushedRef.current = false   // the entry is already gone
      onCloseRef.current()
    }
    window.addEventListener('popstate', onPop)

    return () => {
      window.removeEventListener('popstate', onPop)
      // Closed with a button (not Back): remove our history entry.
      // Deferred so React StrictMode's dev double-run doesn't trigger it.
      setTimeout(() => {
        if (!openRef.current && pushedRef.current) {
          pushedRef.current = false
          history.back()
        }
      }, 0)
    }
  }, [isOpen])

  const projects = resume.projects
  const totalPanels = projects.length + 1 // Projects + Closing panel

  // Credential link of the project currently on screen (none on the closing panel)
  const credentialUrl = activeIdx < projects.length ? projects[activeIdx].credentialUrl : undefined

  // A button shows its text when the header is not compact, while hovered/focused,
  // and (credential button) while an image is enlarged
  const closeExpanded = !compact || hoverClose
  const credExpanded = !compact || hoverCred || !!zoom

  const scrollToPanel = (idx: number, behavior: ScrollBehavior = 'smooth') => {
    const c = containerRef.current
    if (!c) return
    c.scrollTo({ left: idx * c.clientWidth, behavior })
  }

  const goNext = () => {
    if (activeIdx < totalPanels - 1) scrollToPanel(activeIdx + 1)
  }

  const goPrev = () => {
    if (activeIdx > 0) scrollToPanel(activeIdx - 1)
  }

  // On open or initialIndex change, jump to selected project
  useEffect(() => {
    if (!isOpen) return
    const targetIdx = initialIndex ?? 0
    setActiveIdx(targetIdx)
    // Small timeout to allow DOM to layout after slide-in
    const timer = setTimeout(() => {
      scrollToPanel(targetIdx, 'instant' as ScrollBehavior)
      panelRefs.current.forEach((el) => {
        if (el) {
          el.scrollTop = 0
          const textScroll = el.querySelector('.viewer-text-scroll')
          if (textScroll) textScroll.scrollTop = 0
        }
      })
    }, 20)
    return () => clearTimeout(timer)
  }, [isOpen, initialIndex])

  // Reset scroll when activeIdx changes
  useEffect(() => {
    const el = panelRefs.current[activeIdx]
    if (el) {
      el.scrollTop = 0
      const textScroll = el.querySelector('.viewer-text-scroll')
      if (textScroll) textScroll.scrollTop = 0
    }
  }, [activeIdx])

  // Track active panel on scroll
  useEffect(() => {
    const container = containerRef.current
    if (!container || !isOpen) return

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft
      const width = container.clientWidth
      if (width > 0) {
        const idx = Math.round(scrollLeft / width)
        setActiveIdx(Math.max(0, Math.min(totalPanels - 1, idx)))
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [isOpen, totalPanels])

  // Mouse wheel / trackpad: slide smoothly between projects
  useEffect(() => {
    const container = containerRef.current
    if (!container || !isOpen) return

    let locked = false          // true while a slide animation is running
    let acc = 0                 // accumulated wheel distance (for trackpads)
    let accTimer: number | undefined
    let lockTimer: number | undefined
    let lastTextWheel = 0       // last time the wheel was used over scrollable text

    const handleWheel = (e: WheelEvent) => {
      const vertical = Math.abs(e.deltaY) >= Math.abs(e.deltaX)
      const delta = vertical ? e.deltaY : e.deltaX
      if (delta === 0) return
      const now = performance.now()

      // 1) Over scrollable text: let it scroll until it reaches its end
      let overText = false
      if (vertical) {
        let el = e.target as HTMLElement | null
        while (el && el !== container) {
          if (el.scrollHeight > el.clientHeight + 1) {
            const oy = getComputedStyle(el).overflowY
            if (oy === 'auto' || oy === 'scroll') {
              overText = true
              const atTop = el.scrollTop <= 0
              const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1
              if ((delta < 0 && !atTop) || (delta > 0 && !atBottom)) {
                lastTextWheel = now
                return
              }
              break
            }
          }
          el = el.parentElement
        }
      }

      // 2) Otherwise: slide to the neighbouring project
      const justScrolledText = now - lastTextWheel < 250
      if (overText) lastTextWheel = now   // stops one long flick from scrolling text AND changing slide
      e.preventDefault()
      if (locked || justScrolledText) return

      acc += delta
      window.clearTimeout(accTimer)
      accTimer = window.setTimeout(() => { acc = 0 }, 150)
      if (Math.abs(acc) < 40) return

      const dir = acc > 0 ? 1 : -1
      acc = 0
      const next = activeRef.current + dir
      if (next < 0 || next > totalPanels - 1) return

      locked = true
      scrollToPanel(next, 'smooth')
      lockTimer = window.setTimeout(() => { locked = false }, 700)
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      container.removeEventListener('wheel', handleWheel)
      window.clearTimeout(accTimer)
      window.clearTimeout(lockTimer)
    }
  }, [isOpen, totalPanels])

  // Each time the viewer opens: show full buttons, and start listening for the user's first scroll after the slide-in
  useEffect(() => {
    if (!isOpen) {
      armedRef.current = false
      return
    }
    setCompact(false)
    const t = setTimeout(() => { armedRef.current = true }, 900)
    return () => clearTimeout(t)
  }, [isOpen])

  // First scroll of anything inside the viewer (slide between certificates OR the text column) -> compact buttons
  useEffect(() => {
    const container = containerRef.current
    if (!container || !isOpen) return
    const onAnyScroll = () => {
      if (armedRef.current) setCompact(true)
    }
    // capture = true so scrolling inside the text column is also caught
    container.addEventListener('scroll', onAnyScroll, { capture: true, passive: true })
    return () => container.removeEventListener('scroll', onAnyScroll, true)
  }, [isOpen])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    if (zoom) return // lightbox handles keys while enlarged

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (activeIdx < totalPanels - 1) scrollToPanel(activeIdx + 1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (activeIdx > 0) scrollToPanel(activeIdx - 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, activeIdx, totalPanels, onClose, zoom])

  return (
    <div
      id="project-viewer-modal"
      data-project-viewer-open={isOpen ? 'true' : 'false'}
      className={`fixed inset-0 z-50 flex flex-col overflow-hidden bg-void transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
      }`}
      aria-modal="true"
      role="dialog"
      aria-label="Project details viewer"
      data-lenis-prevent
    >
      <style>{LANDSCAPE_CSS}</style>

      {/* Ambient background blur (theme-aware, sits behind everything) */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden="true"
        style={{ background: 'radial-gradient(circle 55vmax at 0% 0%, rgb(var(--accent) / .24) 0%, rgb(var(--accent) / .15) 18%, rgb(var(--accent) / .075) 36%, rgb(var(--accent) / .026) 55%, transparent 74%)' }}
      />

      {/* Top bar: Close (left) + project number (centre). Lives OUTSIDE the scrolling track, so it never moves. */}
      <header className="pv-header relative z-20 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3 sm:px-6 md:pointer-events-none md:absolute md:inset-x-0 md:top-0 md:px-12 md:py-6 lg:px-20">
        <div className="justify-self-start">
          <button
            type="button"
            onClick={onClose}
            onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHoverClose(true) }}
            onPointerLeave={() => setHoverClose(false)}
            onFocus={(e) => { if (e.currentTarget.matches(':focus-visible')) setHoverClose(true) }}
            onBlur={() => setHoverClose(false)}
            data-magnetic
            className={`pointer-events-auto glass glass-pill flex h-10 cursor-pointer items-center text-xs sm:text-sm text-mist transition-all duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-white md:border md:border-white/20 md:bg-[#080c1a]/90 md:shadow-2xl ${
              closeExpanded ? 'px-[13px] md:px-4' : 'px-[13px]'
            }`}
            aria-label="Close project viewer"
          >
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
            </svg>
            <span
              className={`inline-flex items-center gap-2 overflow-hidden whitespace-nowrap transition-all duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                closeExpanded
                  ? 'ml-0 max-w-0 opacity-0 md:ml-2 md:max-w-[12rem] md:opacity-100'
                  : 'ml-0 max-w-0 opacity-0'
              }`}
            >
              <span>Close</span>
              <kbd className="hidden rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-frost xl:inline-block">Esc</kbd>
            </span>
          </button>
        </div>

        <span className="pointer-events-auto glass glass-pill flex h-10 select-none items-center whitespace-nowrap px-4 text-xs sm:text-sm font-medium text-frost md:border md:border-white/20 md:bg-[#080c1a]/90 md:shadow-2xl">
          {activeIdx < projects.length ? `Project ${activeIdx + 1} of ${projects.length}` : 'Conclusion'}
        </span>

        {/* empty cell keeps the project number perfectly centred */}
        <div aria-hidden="true" />
      </header>

      {/* Show credential: top-right. Sits above the enlarged-image overlay, so it stays visible and clickable. */}
      <div className="pv-cred pointer-events-none absolute right-4 top-3 z-40 sm:right-6 md:right-12 md:top-6 lg:right-20">
        <a
          href={credentialUrl || undefined}
          target="_blank"
          rel="noreferrer noopener"
          onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHoverCred(true) }}
          onPointerLeave={() => setHoverCred(false)}
          onFocus={(e) => { if (e.currentTarget.matches(':focus-visible')) setHoverCred(true) }}
          onBlur={() => setHoverCred(false)}
          data-magnetic
          tabIndex={credentialUrl ? 0 : -1}
          aria-hidden={!credentialUrl}
          aria-label={`Show credential for ${projects[activeIdx]?.title ?? 'this project'}, opens in a new tab`}
          className={`glass glass-pill flex h-10 items-center whitespace-nowrap text-xs font-medium text-frost transition-all ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-white sm:text-sm md:border md:border-white/20 md:bg-[#080c1a]/90 md:shadow-2xl ${
            zoom ? 'duration-[2600ms]' : 'duration-[1500ms]'
          } ${
            zoom ? 'px-4' : credExpanded ? 'px-3 md:px-4' : 'px-3'
          } ${
            credentialUrl
              ? 'pointer-events-auto translate-y-0 opacity-100'
              : 'pointer-events-none -translate-y-1 opacity-0'
          }`}
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <span
            className={`overflow-hidden whitespace-nowrap transition-all ease-[cubic-bezier(0.22,1,0.36,1)] ${
              zoom ? 'duration-[2600ms]' : 'duration-[1500ms]'
            } ${
              zoom
                ? 'ml-2 max-w-[12rem] opacity-100'
                : credExpanded
                  ? 'ml-0 max-w-0 opacity-0 md:ml-2 md:max-w-[12rem] md:opacity-100'
                  : 'ml-0 max-w-0 opacity-0'
            }`}
          >
            Show credential
          </span>
        </a>
      </div>

      {/* Horizontal Carousel Track (relative z-10 keeps it ABOVE the background glow, so the colour is the same as the header) */}
      <div
        ref={containerRef}
        className="relative z-10 flex min-h-0 w-full flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain snap-x snap-mandatory no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {projects.map((p, i) => (
          <section
            key={p.title}
            ref={(el) => { panelRefs.current[i] = el }}
            className="pv-panel flex w-screen min-w-full shrink-0 snap-start snap-always self-stretch overflow-x-hidden overflow-y-auto overscroll-y-contain px-4 pt-5 pb-10 sm:px-8 md:px-12 md:pt-24 md:pb-24 lg:overflow-y-hidden lg:px-20 lg:py-0"
            aria-label={`${p.title} details`}
          >
            <div className="pv-grid mx-auto my-auto grid w-full max-w-7xl items-start gap-8 lg:my-0 lg:h-full lg:grid-cols-12 lg:grid-rows-1 lg:items-stretch lg:gap-14">
              {/* Left Column: Details. On desktop ONLY this column scrolls (text), the image stays put. */}
              <TextScroller>
                <div className="pv-textinner lg:my-auto">
                  <p className="pv-kicker text-xs sm:text-sm font-medium tracking-wide uppercase text-neon-soft">
                    {p.year} &bull; {p.role}
                  </p>
                  <h2 className="pv-title mt-2 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-tight text-white">
                    {p.title}
                  </h2>
                  <p className="pv-desc mt-5 text-base sm:text-lg text-mist leading-relaxed">
                    {p.description}
                  </p>

                  {p.highlights && p.highlights.length > 0 && (
                    <div className="pv-hl mt-6 space-y-2.5">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-neon-soft">Key Highlights</h3>
                      <ul className="space-y-2 text-sm sm:text-base text-mist" aria-label="Key highlights">
                        {p.highlights.map((h, hi) => (
                          <li key={hi} className="flex items-start gap-2.5">
                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-neon shrink-0" aria-hidden="true" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pv-chips mt-6">
                    <ul className="flex flex-wrap gap-2" aria-label="Tech stack">
                      {p.stack.map((s) => (
                        <li key={s} className="rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-1 text-xs sm:text-sm text-frost">
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {p.link && (
                    <div className="pv-link mt-8 flex flex-wrap items-center gap-4">
                      <a
                        href={p.link}
                        target="_blank"
                        rel="noreferrer noopener"
                        data-magnetic
                        className="btn"
                      >
                        <span>Visit project</span>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span className="sr-only"> {p.title}, opens in a new tab</span>
                      </a>
                    </div>
                  )}
                </div>
              </TextScroller>

              {/* Right Column: Visual. Fixed on desktop, centred between the top bar and the nav bar. */}
              <div className="pv-visual-col order-1 mx-auto w-full md:max-w-xl lg:order-2 lg:col-span-6 lg:mx-0 lg:flex lg:h-full lg:min-h-0 lg:max-w-none lg:flex-col lg:items-center lg:justify-center lg:pb-24 lg:pt-24">
                <GlassCard
                  tilt
                  smooth
                  data-cursor
                  role={p.image ? 'button' : undefined}
                  tabIndex={p.image ? 0 : undefined}
                  aria-label={p.image ? `Enlarge ${p.title} screenshot` : undefined}
                  onClick={(e) => p.image && openZoom(p, i, e.currentTarget)}
                  onKeyDown={(e) => {
                    if (p.image && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault()
                      openZoom(p, i, e.currentTarget)
                    }
                  }}
                  className={`viewer-visual group relative aspect-[4/3] lg:aspect-[16/10] w-full shrink-0 overflow-hidden bg-[#0a0d1f] !rounded-3xl p-0 shadow-2xl border border-white/20 ${
                    p.image ? 'cursor-zoom-in' : ''
                  } ${zoom?.idx === i ? 'opacity-0' : ''}`}
                >
                  <ProjectArt p={p} />
                </GlassCard>
                {p.image && (
                  <p
                    aria-hidden="true"
                    className="mt-3 w-full select-none text-center text-xs font-medium tracking-wide text-mist/70 pointer-events-none"
                    style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                  >
                    Click the image to enlarge
                  </p>
                )}
              </div>
            </div>
          </section>
        ))}

        {/* Final Closing Panel (static on tablet / desktop) */}
        <section
          ref={(el) => { panelRefs.current[projects.length] = el }}
          className="pv-close flex w-screen min-w-full shrink-0 snap-start snap-always self-stretch items-center justify-center overflow-x-hidden overflow-y-auto px-4 pt-5 pb-10 sm:px-8 md:overflow-y-hidden md:px-12 md:pt-20 md:pb-24"
          aria-label="Contact and conclusion"
        >
          <GlassCard className="pv-close-card mx-auto max-w-2xl w-full p-8 sm:p-12 text-center border border-white/20 my-auto">
            <span className="inline-block rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wider uppercase text-neon-soft">
              Next Step
            </span>
            <h2 className="mt-5 text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white">
              Interested in working together?
            </h2>
            <p className="mt-4 text-base sm:text-lg text-mist leading-relaxed">
              I am open to design engineering roles, high-craft freelance projects, and creative collaborations.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={onContact}
                data-magnetic
                className="btn !py-3.5 px-7"
              >
                Get in touch
              </button>
              <button
                type="button"
                onClick={onClose}
                data-magnetic
                className="btn btn-ghost !py-3.5 px-6"
              >
                Back to all projects
              </button>
            </div>
          </GlassCard>
        </section>
      </div>

      <footer className="pv-footer relative shrink-0 md:absolute md:inset-x-0 md:bottom-6 z-20 px-4 lg:px-20 pointer-events-none pb-4 md:pb-0">
        <div className="pv-footer-inner mx-auto w-full max-w-7xl lg:grid lg:grid-cols-12 lg:gap-14">
          <div
            className={`viewer-controls-bar pv-controls w-full flex items-center justify-center gap-3 lg:col-start-7 lg:col-span-6 ${
              activeIdx >= projects.length ? 'is-centered' : ''
            }`}
          >
            {/* Carousel navigation bar */}
            <nav
              aria-label="Viewer carousel navigation"
              className="pointer-events-auto glass glass-pill flex h-10 items-center gap-2 sm:gap-3 p-1.5 bg-[#080c1a]/90 border border-white/20 shadow-2xl"
            >
              <button
                type="button"
                onClick={goPrev}
                disabled={activeIdx === 0}
                data-magnetic
                className="rounded-full px-3 py-1 text-xs sm:text-sm font-medium text-mist hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                aria-label="Previous project"
              >
                &larr; Prev
              </button>

              <div className="flex items-center gap-1.5 px-2" aria-hidden="true">
                {Array.from({ length: totalPanels }).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => scrollToPanel(idx)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      activeIdx === idx
                        ? 'w-6 bg-neon shadow-[0_0_10px_rgba(61,139,255,0.8)]'
                        : 'w-2 bg-white/25 hover:bg-white/50'
                    }`}
                    aria-label={idx < projects.length ? `Go to project ${idx + 1}` : 'Go to final panel'}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={goNext}
                disabled={activeIdx === totalPanels - 1}
                data-magnetic
                className="rounded-full px-3 py-1 text-xs sm:text-sm font-medium text-mist hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                aria-label="Next project"
              >
                Next &rarr;
              </button>
            </nav>
          </div>
        </div>
      </footer>

      {zoom && <ImageLightbox zoom={zoom} onClosed={() => setZoom(null)} />}
    </div>
  )
}