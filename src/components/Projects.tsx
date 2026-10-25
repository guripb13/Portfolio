import { useEffect, useRef, useState } from 'react'
import { gsap, useGSAP } from '../lib/gsap'
import { resume } from '../data/resume'
import ProjectArt from './ProjectArt'
import { setHoveredProject } from '../lib/backdropStore'
import { useReducedMotion } from '../lib/useMedia'

interface ProjectsProps {
  onOpenProject?: (index: number) => void
}

/* ───────── Carousel settings (all screen sizes) ───────── */
const SIDE_SCALE = 0.78   // neighbour cards are this much smaller than the centre card
const SIDE_OPACITY = 0.55 // opacity of the first neighbours (1 = solid, lower = more see-through)
const SIDE_STEP = 0.82    // how far the first neighbour sits from the centre, in card widths (also = 1 card of dragging)
const FAR_STEP = 0.55     // every card further out
const DRAG_START = 6      // px of mouse movement before a press turns into a drag
const EDGE_RESIST = 0.35  // dragging past the first / last card only moves this fraction
const FLING_MS = 260      // how far a fast flick keeps travelling (in ms of its speed)

const ArrowIcon = ({ dir }: { dir: 'l' | 'r' }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === 'l' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
  </svg>
)

/**
 * Horizontal certificate flow that scrolls like a scroll bar.
 * - Hold the left mouse button (or swipe with a finger) and drag: the certificates follow the pointer, as far as you drag. Let go and the nearest one settles in the centre (a fast flick carries on further).
 * - The centre card is the certificate (image fills the card, its name at the bottom). "Click the certificate to view details" sits right under it.
 * - A round arrow sits at the left / right edge. It is hidden when there is no certificate on that side.
 * - The neighbour cards are see-through (not darker), so they seem to sit behind the centre card; the left and right ends fade and blur softly.
 * - The last card of the flow is "View all certificates". Clicking anywhere on it opens the full viewer from the start.
 */
function CertCarousel({ onOpenProject }: ProjectsProps) {
  const projects = resume.projects
  const total = projects.length + 1 // every certificate + the closing "view all" card
  const LAST = projects.length
  const MAX = total - 1
  const reduced = useReducedMotion()

  const [pos, setPos] = useState(0)            // which card is in the centre; fractional while dragging (1.5 = halfway between card 1 and 2)
  const [dragging, setDragging] = useState(false)

  const posRef = useRef(0)
  posRef.current = pos
  const stageRef = useRef<HTMLDivElement>(null)
  const suppress = useRef(false)               // swallow the click that follows a drag
  const firstRun = useRef(true)
  const drag = useRef({ down: false, moved: false, startX: 0, startPos: 0, pitch: 1, samples: [] as { x: number; t: number }[] })

  const clamp = (v: number) => Math.max(0, Math.min(MAX, v))
  const active = Math.round(clamp(pos))        // the card that is (nearly) in the centre
  const onLast = active === LAST

  const go = (i: number) => setPos(clamp(Math.round(i)))

  // Tell the page backdrop which certificate is in the centre
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return }
    setHoveredProject(active < LAST ? active : null)
  }, [active, LAST])

  // Warm the cache so cards never flash while sliding
  useEffect(() => {
    projects.forEach((q) => { if (q.image) new Image().src = q.image })
  }, [projects])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(active + 1) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(active - 1) }
    else if (e.key === 'Home') { e.preventDefault(); go(0) }
    else if (e.key === 'End') { e.preventDefault(); go(MAX) }
    else if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onOpenProject?.(active < LAST ? active : 0) }
  }

  /* ── Drag to scroll (mouse, pen and touch) ── */
  /** Past the first / last card the carousel stretches only a little, then springs back. */
  const rubber = (v: number) => (v < 0 ? v * EDGE_RESIST : v > MAX ? MAX + (v - MAX) * EDGE_RESIST : v)

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const card = stageRef.current?.querySelector<HTMLElement>('[data-card]')
    const d = drag.current
    d.down = true
    d.moved = false
    d.startX = e.clientX
    d.startPos = posRef.current
    d.pitch = Math.max((card?.offsetWidth ?? 500) * SIDE_STEP, 1) // pixels of dragging that equal one certificate
    d.samples = [{ x: e.clientX, t: performance.now() }]
    suppress.current = false
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d.down) return
    if (!d.moved) {
      if (Math.abs(e.clientX - d.startX) < DRAG_START) return
      d.moved = true
      d.startX = e.clientX // start from here so the cards do not jump
      d.startPos = posRef.current
      setDragging(true)
      stageRef.current?.setPointerCapture?.(e.pointerId)
    }
    const now = performance.now()
    d.samples.push({ x: e.clientX, t: now })
    if (d.samples.length > 8) d.samples.shift()
    setPos(rubber(d.startPos - (e.clientX - d.startX) / d.pitch))
  }

  const finishDrag = (e: React.PointerEvent, cancelled: boolean) => {
    const d = drag.current
    if (!d.down) return
    d.down = false
    if (!d.moved) return
    stageRef.current?.releasePointerCapture?.(e.pointerId)
    suppress.current = true

    // Speed of the last ~100 ms decides how far a flick carries on
    const now = performance.now()
    const recent = d.samples.filter((s) => now - s.t < 100)
    let v = 0
    if (!cancelled && recent.length > 1) {
      const first = recent[0]
      const last = recent[recent.length - 1]
      v = (last.x - first.x) / Math.max(last.t - first.t, 1) // px per ms
    }
    const projected = posRef.current - (v * FLING_MS) / d.pitch
    setDragging(false)
    setPos(clamp(Math.round(projected)))
  }

  /** Where one card sits, from its (fractional) distance to the centre. */
  const cardStyle = (offset: number): React.CSSProperties => {
    const abs = Math.abs(offset)
    const sign = Math.sign(offset)
    const dist = abs <= 1 ? abs * SIDE_STEP : SIDE_STEP + (abs - 1) * FAR_STEP
    const scale = abs <= 1 ? 1 - abs * (1 - SIDE_SCALE) : Math.max(SIDE_SCALE - (abs - 1) * 0.14, 0.5)
    // Neighbours get see-through (not darker): they look like they sit behind the centre card
    const opacity = abs <= 1 ? 1 - abs * (1 - SIDE_OPACITY) : Math.max(0, SIDE_OPACITY * (1 - (abs - 1) / 0.8))
    return {
      transform: `translate(-50%, -50%) translateX(calc(var(--w) * ${sign * dist})) scale(${scale})`,
      opacity,
      zIndex: Math.round(50 - abs * 10),
      pointerEvents: abs < 1.5 ? 'auto' : 'none',
      transition: dragging || reduced ? 'none' : 'transform 700ms var(--ease-out-expo), opacity 450ms ease, box-shadow 550ms ease, border-color 550ms ease',
      willChange: 'transform',
    }
  }

  const arrowBase =
    'cert-arrow absolute top-1/2 z-[60] grid size-10 -translate-y-1/2 place-items-center rounded-full backdrop-blur-md transition-all duration-300 hover:scale-110 md:size-12 lg:size-14'

  return (
    <div className="work-desktop">
      {/* ── The horizontal flow ── */}
      <div
        ref={stageRef}
        className={`work-stage relative isolate z-0 -mx-4 select-none [--h:clamp(19rem,46svh,24rem)] [--w:min(72vw,22rem)] sm:-mx-6 sm:[--w:min(60vw,26rem)] md:-mx-10 md:[--h:clamp(19rem,50svh,27rem)] md:[--w:min(52vw,30rem)] lg:-mx-24 lg:[--w:clamp(26rem,42vw,36rem)] ${
          dragging ? 'cursor-grabbing [&_*]:!cursor-grabbing' : 'cursor-grab'
        }`}
        style={{ height: 'calc(var(--h) + 3rem)', touchAction: 'pan-y' }}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label="Certificates and simulations. Drag sideways or use the left and right arrow keys to scroll."
        onKeyDown={onKey}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => finishDrag(e, false)}
        onPointerCancel={(e) => finishDrag(e, true)}
      >
        {/* Cards. Taller than the stage so shadows are not cut; the sides fade out softly (mask) */}
        <div className="cert-track pointer-events-none absolute inset-x-0 -bottom-20 -top-20 [overflow-x:clip]">
        {Array.from({ length: total }, (_, id) => {
          const offset = id - pos
          const isCenter = id === active
          const isLast = id === LAST
          const p = isLast ? null : projects[id]

          const onCardClick = () => {
            if (suppress.current) { suppress.current = false; return }
            if (isCenter) onOpenProject?.(isLast ? 0 : id) // the "View all" card opens the viewer at the first certificate
            else if (Math.abs(id - active) === 1) go(id)
          }

          return (
            <div
              key={id}
              data-card
              onClick={onCardClick}
              data-cursor={Math.abs(id - active) <= 1 ? '' : undefined}
              aria-hidden={isCenter ? undefined : true}
              role={isCenter && !isLast ? 'button' : undefined}
              aria-label={isCenter && !isLast ? `View ${p!.title}. Certificate ${id + 1} of ${projects.length}.` : undefined}
              className="absolute left-1/2 top-1/2 flex h-[var(--h)] w-[var(--w)] flex-col overflow-hidden rounded-[2rem] border [&_img]:pointer-events-none [&_img]:select-none"
              style={{
                ...cardStyle(offset),
                cursor: isCenter && isLast && !dragging ? 'pointer' : undefined,
                background: 'var(--color-deep)',
                borderColor: isCenter ? 'rgb(var(--accent) / .55)' : 'rgb(var(--accent) / .25)',
                boxShadow: isCenter
                  ? '0 30px 70px -26px rgb(0 0 0 / .75), 0 0 0 1px rgb(255 255 255 / .05), -18px -18px 70px -30px rgb(var(--accent) / .5)'
                  : 'none',
              }}
            >
              {isLast ? (
                /* ── Closing card: View all ── */
                <div className="cert-viewall relative flex flex-1 flex-col items-center justify-center px-8 text-center">
                  <span className="cert-viewall-icon grid size-16 place-items-center rounded-full">
                    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="4" width="14" height="14" rx="2.5" />
                      <path d="M7 21h12a2 2 0 0 0 2-2V8" />
                      <path d="M7 9h6M7 13h4" />
                    </svg>
                  </span>
                  <h3 className="cert-viewall-title mt-5 font-display text-2xl font-bold leading-tight xl:text-3xl">View all certificates</h3>
                  <p className="cert-viewall-text mt-2 max-w-[30ch] text-sm leading-relaxed">
                    Open every course and job simulation in full detail: what I learned, the skills used and the credentials.
                  </p>
                  <button
                    type="button"
                    data-cursor
                    tabIndex={isCenter ? 0 : -1}
                    onClick={(e) => { e.stopPropagation(); if (!suppress.current) onOpenProject?.(0); suppress.current = false }}
                    className="cert-viewall-chip mt-3 cursor-pointer rounded-full px-3 py-1 font-mono text-xs transition-transform duration-200 hover:scale-105"
                  >
                    {projects.length} certificates &amp; simulations
                  </button>
                  <button
                    type="button"
                    data-cursor
                    tabIndex={isCenter ? 0 : -1}
                    onClick={(e) => { e.stopPropagation(); if (!suppress.current) onOpenProject?.(0); suppress.current = false }}
                    className="btn mt-6"
                  >
                    View all
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </button>
                </div>
              ) : (
                /* ── Certificate card: image fills the card, name at the bottom ── */
                <>
                  <div className="relative min-h-0 flex-1 overflow-hidden bg-[#080c1a]">
                    {p!.image ? (
                      <img src={p!.image} alt={`${p!.title} certificate`} draggable={false} className="absolute inset-0 h-full w-full object-cover object-center" />
                    ) : (
                      <ProjectArt p={p!} />
                    )}
                  </div>
                  <div className="cert-foot h-[5.5rem] shrink-0 border-t border-white/10 px-5 py-3">
                    <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug text-frost xl:text-lg">{p!.title}</h3>
                    <div className="mt-1 flex items-center justify-between gap-3 font-mono text-[11px] text-mist">
                      <span>{p!.year}</span>
                      <span className="truncate text-right text-frost/60">{p!.role}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        })}
        </div>

        {/* Soft blur that grows toward the left and right edges: 4 thin layers give a smooth ramp with no visible line */}
        <div aria-hidden="true" className="cert-blur cert-blur-l"><span /><span /><span /><span /></div>
        <div aria-hidden="true" className="cert-blur cert-blur-r"><span /><span /><span /><span /></div>

        {/* Left arrow: hidden when there is no certificate on the left */}
        <button
          type="button"
          data-cursor
          aria-label="Previous certificate"
          aria-hidden={active === 0}
          tabIndex={active === 0 ? -1 : 0}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => go(active - 1)}
          className={`${arrowBase} left-3 md:left-5 ${active === 0 ? 'pointer-events-none scale-75 opacity-0' : 'opacity-100'}`}
        >
          <ArrowIcon dir="l" />
        </button>

        {/* Right arrow: hidden when there is no certificate on the right */}
        <button
          type="button"
          data-cursor
          aria-label={active === LAST - 1 ? 'Next: view all certificates' : 'Next certificate'}
          aria-hidden={active === MAX}
          tabIndex={active === MAX ? -1 : 0}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => go(active + 1)}
          className={`${arrowBase} right-3 md:right-5 ${active === MAX ? 'pointer-events-none scale-75 opacity-0' : 'opacity-100'}`}
        >
          <ArrowIcon dir="r" />
        </button>
      </div>

      {/* ── Hint right under the centre card ── */}
      <div className="cert-hint mt-2 flex flex-col items-center gap-4">
        <button
          type="button"
          data-cursor
          disabled={onLast}
          onClick={() => { if (!onLast) onOpenProject?.(active) }}
          className="cert-hint-btn group flex items-center gap-2 font-mono text-sm text-mist transition-colors enabled:hover:text-neon-soft disabled:cursor-default"
        >
          <span>{onLast ? 'Press the button to view all' : 'Click on the certificate to view details'}</span>
          {!onLast && (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          )}
        </button>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Choose a certificate">
          {Array.from({ length: total }, (_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={i === LAST ? 'View all card' : `Certificate ${i + 1}`}
              onClick={() => go(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? 'w-6 bg-neon' : 'w-1.5 bg-white/25 hover:bg-white/45'}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Edge fade / blur masks ──
 * A straight (linear) fade shows a faint line where it starts, worst on dark backgrounds.
 * These masks use an eased "smoothstep" curve, so the fade starts and ends with no visible edge. */
const smooth = (t: number) => t * t * (3 - 2 * t)
const alpha = (a: number) => `rgb(0 0 0/${a.toFixed(3)})`

/** Cards fade to the page background over the outer 8% on each side. */
const TRACK_MASK = (() => {
  const FADE = 8, N = 12
  const st: string[] = []
  for (let i = 0; i <= N; i++) st.push(`${alpha(smooth(i / N))} ${((FADE * i) / N).toFixed(2)}%`)
  for (let i = 0; i <= N; i++) st.push(`${alpha(1 - smooth(i / N))} ${(100 - FADE + (FADE * i) / N).toFixed(2)}%`)
  return `linear-gradient(to right,${st.join(',')})`
})()

/** Blur layers: [blur px, fully on until %, gone at %]. Stacked, they make the blur grow smoothly toward the edge. */
const BLUR_LAYERS: [number, number, number][] = [[0.6, 45, 100], [1.2, 30, 80], [2.4, 15, 60], [4, 0, 40]]
const edgeMask = (dir: 'to right' | 'to left', solid: number, end: number) => {
  const N = 10
  const st = [`#000 0`, `#000 ${solid}%`]
  for (let i = 1; i <= N; i++) st.push(`${alpha(1 - smooth(i / N))} ${(solid + ((end - solid) * i) / N).toFixed(2)}%`)
  return `linear-gradient(${dir},${st.join(',')})`
}
const BLUR_CSS = (['l', 'r'] as const)
  .flatMap((side) =>
    BLUR_LAYERS.map(([blur, solid, end], i) => {
      const m = edgeMask(side === 'l' ? 'to right' : 'to left', solid, end)
      return `.cert-blur-${side} span:nth-child(${i + 1}){-webkit-backdrop-filter:blur(${blur}px);backdrop-filter:blur(${blur}px);-webkit-mask-image:${m};mask-image:${m}}`
    }),
  )
  .join('\n')

/** Colours that must follow the light / dark theme: the arrows, the "View all" cards and the soft fade at the carousel edges. */
const THEME_CSS = `
.cert-arrow{background:rgb(0 0 0/.45);color:#fff;border:1px solid rgb(255 255 255/.3);box-shadow:0 8px 24px -8px rgb(0 0 0/.6)}
.cert-arrow:hover{background:rgb(0 0 0/.62)}
html[data-theme="light"] .cert-arrow{background:rgb(255 255 255/.95);color:#0e1326;border-color:rgb(14 19 38/.16);box-shadow:0 10px 28px -10px rgb(14 19 38/.45)}
html[data-theme="light"] .cert-arrow:hover{background:#fff;color:#2563eb}

.cert-viewall{background:radial-gradient(circle 24rem at 50% 0%,rgb(var(--accent)/.4),transparent 70%),#0a0d1f}
.cert-viewall-bordered{border:1px solid rgb(255 255 255/.1)}
.cert-viewall-icon{color:var(--color-neon-soft);background:rgb(255 255 255/.1);border:1px solid rgb(255 255 255/.2)}
.cert-viewall-title{color:#fff}
.cert-viewall-text{color:rgb(255 255 255/.72)}
.cert-viewall-chip{color:rgb(255 255 255/.85);background:rgb(255 255 255/.1);border:1px solid rgb(255 255 255/.15)}
html[data-theme="light"] .cert-viewall{background:radial-gradient(circle 24rem at 50% 0%,rgb(var(--accent)/.2),transparent 70%),#eef3fd}
html[data-theme="light"] .cert-viewall-bordered{border-color:rgb(37 99 235/.2)}
html[data-theme="light"] .cert-viewall-icon{color:#2563eb;background:rgb(37 99 235/.1);border-color:rgb(37 99 235/.25)}
html[data-theme="light"] .cert-viewall-title{color:#0e1326}
html[data-theme="light"] .cert-viewall-text{color:rgb(14 19 38/.72)}
html[data-theme="light"] .cert-viewall-chip{color:rgb(14 19 38/.8);background:rgb(37 99 235/.08);border-color:rgb(37 99 235/.25)}

.cert-track{-webkit-mask-image:${TRACK_MASK};mask-image:${TRACK_MASK}}
.cert-blur{position:absolute;top:0;bottom:0;width:9%;z-index:55;pointer-events:none}
.cert-blur-l{left:0}
.cert-blur-r{right:0}
.cert-blur span{position:absolute;inset:0}
${BLUR_CSS}

/* Phones turned sideways: the whole certificate must fit on the screen at once */
@media (orientation:landscape) and (max-height:520px){
  #work{padding-top:4.75rem !important;padding-bottom:.75rem !important;min-height:0 !important}
  #work .work-sub,#work .cert-hint-btn{display:none !important}
  #work .work-stage{--h:clamp(9.5rem,calc(100svh - 11.5rem),17rem) !important;--w:min(46vw,calc(var(--h) * 1.7)) !important;height:calc(var(--h) + 1rem) !important}
  #work .cert-foot{height:3.25rem !important;padding-top:.4rem !important;padding-bottom:.4rem !important}
  #work .cert-foot h3{-webkit-line-clamp:1 !important;font-size:.85rem !important}
  #work .cert-hint{margin-top:.25rem !important;gap:.5rem !important}
}
`

/**
 * Work section.
 * - Every device (phone, tablet, desktop): the same drag / swipe-to-scroll certificate flow above.
 */
export default function Projects({ onOpenProject }: ProjectsProps) {
  const root = useRef<HTMLElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const trigger = { trigger: root.current, start: 'top 85%', once: true }
      gsap.fromTo('.work-stage', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', scrollTrigger: trigger, clearProps: 'transform,opacity' })
    })
    return () => mm.revert()
  }, { scope: root })

  return (
    <section id="work" ref={root} className="relative flex min-h-svh flex-col justify-center py-24">
      <style>{THEME_CSS}</style>
      <div className="mx-auto flex w-full max-w-7xl flex-col justify-center overflow-x-clip px-4 sm:px-6 md:px-10 lg:px-24">
        {/* Header bar */}
        <div className="flex flex-wrap items-end justify-between gap-3 pb-3 sm:pb-5">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl md:text-3xl lg:text-4xl">
              Courses &amp; simulations
            </h2>
            <p className="work-sub mt-1 max-w-[50ch] text-xs text-mist sm:text-sm">
              A curated overview of coursework, AI implementations, and hands-on job simulations.
            </p>
          </div>
          <span className="glass glass-pill px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-neon-soft sm:text-xs">
            {resume.projects.length} Highlights
          </span>
        </div>

        {/* Horizontal certificate flow (all devices) */}
        <CertCarousel onOpenProject={onOpenProject} />
      </div>
    </section>
  )
}