import { useEffect, useRef, useState } from 'react'
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

export default function ProjectViewer({ initialIndex, isOpen, onClose, onContact }: ProjectViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const panelRefs = useRef<(HTMLElement | null)[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [zoom, setZoom] = useState<ZoomState | null>(null)

  const openZoom = (p: (typeof projects)[number], idx: number, card: HTMLElement) => {
    const img = card.querySelector('img')
    if (!img || !p.image) return
    setZoom({
      idx,
      el: card,
      low: p.image,
      full: p.imageFull ?? p.image,
      alt: p.title,
      ratio: img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 4 / 3,
    })
  }

  // Start downloading the big image as soon as the pointer is over the thumbnail
  const preload = (src?: string) => {
    if (src) new Image().src = src
  }

  // If the whole viewer closes, drop the enlarged image
  useEffect(() => {
    if (!isOpen) setZoom(null)
  }, [isOpen])

  const projects = resume.projects
  const totalPanels = projects.length + 1 // Projects + Closing panel

  const scrollToPanel = (idx: number) => {
    panelRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', inline: 'start' })
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
      const el = panelRefs.current[targetIdx]
      if (el && containerRef.current) {
        el.scrollIntoView({ inline: 'start', block: 'nearest', behavior: 'instant' as ScrollBehavior })
      }
    }, 20)
    return () => clearTimeout(timer)
  }, [isOpen, initialIndex])

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

  // Mouse wheel horizontal translation
  useEffect(() => {
    const container = containerRef.current
    if (!container || !isOpen) return

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault()
        container.scrollBy({ left: e.deltaY * 1.2, behavior: 'auto' })
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [isOpen])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    if (zoom) return // lightbox handles keys while enlarged

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        if (activeIdx < totalPanels - 1) {
          panelRefs.current[activeIdx + 1]?.scrollIntoView({ behavior: 'smooth', inline: 'start' })
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        if (activeIdx > 0) {
          panelRefs.current[activeIdx - 1]?.scrollIntoView({ behavior: 'smooth', inline: 'start' })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, activeIdx, totalPanels, onClose, zoom])



  return (
    <div
      id="project-viewer-modal"
      data-project-viewer-open={isOpen ? 'true' : 'false'}
      className={`fixed inset-0 z-50 overflow-hidden bg-void transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
      }`}
      aria-modal="true"
      role="dialog"
      aria-label="Project details viewer"
    >
      {/* Ambient background blur */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden="true"
        style={{ background: 'radial-gradient(circle 55vmax at 0% 0%, rgb(61 139 255 / .24) 0%, rgb(61 139 255 / .15) 18%, rgb(61 139 255 / .075) 36%, rgb(61 139 255 / .026) 55%, transparent 74%)' }}
      />

      {/* Top Header Bar (mobile view; relocated adjacent to bottom nav in desktop view) */}
      <header className="absolute inset-x-0 top-0 z-20 flex md:hidden items-center justify-between px-6 py-6 md:px-12 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3">
          <span className="glass glass-pill px-4 py-1.5 text-xs sm:text-sm font-medium text-frost">
            {activeIdx < projects.length ? `Project ${activeIdx + 1} of ${projects.length}` : 'Conclusion'}
          </span>
        </div>

        <button
          onClick={onClose}
          data-magnetic
          className="pointer-events-auto glass glass-pill flex items-center gap-2 px-4 py-2 text-xs sm:text-sm text-mist hover:text-white transition-colors"
          aria-label="Close project viewer"
        >
          <span>Close</span>
          <kbd className="hidden sm:inline-block rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-frost">Esc</kbd>
        </button>
      </header>

      {/* Horizontal Carousel Track */}
      <div
        ref={containerRef}
        className="flex h-full w-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {projects.map((p, i) => (
          <section
            key={p.title}
            ref={(el) => { panelRefs.current[i] = el }}
            className="flex h-full w-screen min-w-full shrink-0 snap-start items-center justify-center overflow-y-auto px-6 py-24 md:px-12 md:py-20 lg:px-20"
            aria-label={`${p.title} details`}
          >
            <div className="mx-auto grid w-full max-w-7xl items-center gap-8 lg:grid-cols-12 lg:gap-14">
              {/* Left Column: Details */}
              <div className="order-2 lg:order-1 lg:col-span-6 flex flex-col justify-center">
                <p className="text-xs sm:text-sm font-medium tracking-wide uppercase text-neon-soft">
                  {p.year} &bull; {p.role}
                </p>
                <h2 className="mt-2 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-tight text-white">
                  {p.title}
                </h2>
                <p className="mt-5 text-base sm:text-lg text-mist leading-relaxed">
                  {p.description}
                </p>

                {p.highlights && p.highlights.length > 0 && (
                  <div className="mt-6 space-y-2.5">
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

                <div className="mt-6">
                  <ul className="flex flex-wrap gap-2" aria-label="Tech stack">
                    {p.stack.map((s) => (
                      <li key={s} className="rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-1 text-xs sm:text-sm text-frost">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                {p.link && (
                  <div className="mt-8 flex flex-wrap items-center gap-4">
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

              {/* Right Column: Visual */}
              <div className="order-1 lg:order-2 lg:col-span-6">
                <GlassCard
                  tilt
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
                  onPointerEnter={() => preload(p.imageFull)}
                  className={`group relative aspect-[16/10] sm:aspect-[4/3] w-full overflow-hidden !rounded-3xl p-0 shadow-2xl border border-white/20 ${
                    p.image ? 'cursor-zoom-in' : ''
                  } ${zoom?.idx === i ? 'opacity-0' : ''}`}
                >
                  <ProjectArt p={p} />
                </GlassCard>
              </div>
            </div>
          </section>
        ))}

        {/* Final Closing Panel */}
        <section
          ref={(el) => { panelRefs.current[projects.length] = el }}
          className="flex h-full w-screen min-w-full shrink-0 snap-start items-center justify-center px-6 py-24 md:px-12"
          aria-label="Contact and conclusion"
        >
          <GlassCard className="mx-auto max-w-2xl w-full p-8 sm:p-12 text-center border border-white/20">
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

      <footer className="absolute inset-x-0 bottom-6 z-20 px-4 lg:px-20 pointer-events-none">
        <div className="mx-auto w-full max-w-7xl lg:grid lg:grid-cols-12 lg:gap-14">
          <div
            className={`viewer-controls-bar w-full flex items-center justify-center gap-3 lg:col-start-7 lg:col-span-6 ${
              activeIdx >= projects.length ? 'is-centered' : ''
            }`}
          >
            {/* Desktop Left: Project indicator */}
            <div className="hidden md:flex pointer-events-auto h-10 items-center">
              <span className="glass glass-pill flex h-full items-center px-4 text-xs sm:text-sm font-medium text-frost bg-[#080c1a]/90 border border-white/20 shadow-2xl select-none">
                {activeIdx < projects.length ? `Project ${activeIdx + 1} of ${projects.length}` : 'Conclusion'}
              </span>
            </div>

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

            {/* Desktop Right: Close button */}
            <button
              type="button"
              onClick={onClose}
              data-magnetic
              className="hidden md:flex pointer-events-auto glass glass-pill h-10 items-center gap-2 px-4 text-xs sm:text-sm text-mist hover:text-white transition-colors bg-[#080c1a]/90 border border-white/20 shadow-2xl cursor-pointer"
              aria-label="Close project viewer"
            >
              <span>Close</span>
              <kbd className="hidden xl:inline-block rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-frost">Esc</kbd>
            </button>
          </div>
        </div>
      </footer>

      {zoom && <ImageLightbox zoom={zoom} onClosed={() => setZoom(null)} />}
    </div>
  )
}
