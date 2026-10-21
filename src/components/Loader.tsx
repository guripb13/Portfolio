import { useEffect, useRef, useState } from 'react'
import { gsap } from '../lib/gsap'
import { resume } from '../data/resume'

const withTimeout = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<undefined>((res) => window.setTimeout(res, ms))])

const loadImg = (src: string) =>
  new Promise<void>((res) => {
    const i = new Image()
    i.onload = () => res()
    i.onerror = () => res() // a missing image must never block the site
    i.src = src
  })

interface Props {
  onReady: () => void
  onExited: () => void
}

export default function Loader({ onReady, onExited }: Props) {
  const [ready, setReady] = useState(false)
  const curtainRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const emblemRef = useRef<HTMLDivElement>(null)
  const emblemGlowRef = useRef<HTMLDivElement>(null)
  const progressBlockRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef<HTMLSpanElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const pct = useRef<HTMLSpanElement>(null)
  const isMorphing = useRef(false)

  /* Real loading: fonts + photos with timeouts so nothing hangs */
  useEffect(() => {
    let alive = true
    let done = 0
    let target = 0
    let shown = 0
    let raf = 0
    const started = performance.now()

    const tasks: Promise<unknown>[] = [
      withTimeout(document.fonts?.load('700 1em "Bricolage Grotesque"') ?? Promise.resolve(), 4000),
      withTimeout(loadImg(resume.photo), 8000),
      withTimeout(loadImg(resume.aboutPhoto), 8000),
    ]
    tasks.forEach((t) => t.catch(() => undefined).finally(() => { done++; target = done / tasks.length }))

    const triggerMorph = () => {
      if (isMorphing.current) return
      isMorphing.current = true
      setReady(true)

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      // Signal main page to begin synchronized entrance
      onReady()

      if (reduced) {
        gsap.to(curtainRef.current, {
          opacity: 0,
          duration: 0.3,
          onComplete: onExited,
        })
        return
      }

      // Premium seamless morphing choreography using intentional exponential bezier curves
      const tl = gsap.timeline({
        onComplete: () => {
          onExited()
        },
      })

      // Phase 1: Dissolve the progress meter downward
      tl.to(progressBlockRef.current, {
        opacity: 0,
        y: 14,
        duration: 0.32,
        ease: 'power2.in',
      })

      // Phase 2: Core emblem surges with energy and expands
      tl.to(
        emblemGlowRef.current,
        {
          scale: 3.2,
          opacity: 1,
          duration: 0.65,
          ease: 'power2.out',
        },
        '-=0.15',
      )

      tl.to(
        emblemRef.current,
        {
          scale: 1.25,
          duration: 0.5,
          ease: 'back.out(1.5)',
        },
        '-=0.6',
      )

      // Phase 3: Morph brand unit upwards & dissolve towards the hero header position
      tl.to(
        cardRef.current,
        {
          y: -36,
          scale: 1.08,
          opacity: 0,
          filter: 'blur(16px)',
          duration: 0.85,
          ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
        },
        '-=0.35',
      )

      // Phase 4: Full-screen curtain expands & dissolves into the pre-rendered hero
      tl.to(
        curtainRef.current,
        {
          opacity: 0,
          scale: 1.05,
          filter: 'blur(20px)',
          duration: 0.95,
          ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
        },
        '-=0.75',
      )
    }

    const loop = () => {
      if (!alive) return
      const elapsed = performance.now() - started
      const minimum = Math.min(elapsed / 800, 1) // ~0.8s minimum smooth progress bar feel
      const goal = Math.min(target, minimum)
      shown += (goal - shown) * 0.14
      if (goal >= 1 && 1 - shown < 0.003) shown = 1
      if (bar.current) bar.current.style.transform = `scaleX(${shown})`
      if (pct.current) pct.current.textContent = `${Math.round(shown * 100)}%`

      if (shown >= 1) {
        // Small graceful pause at 100% before morph triggers
        window.setTimeout(() => {
          if (alive) triggerMorph()
        }, 120)
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
    }
  }, [onReady, onExited])

  return (
    <div
      ref={curtainRef}
      role="dialog"
      aria-modal="true"
      aria-label="Loading portfolio"
      className="fixed inset-0 z-[200] grid place-items-center bg-void px-6 py-10 overflow-hidden pointer-events-auto will-change-[transform,opacity,filter]"
      style={{
        backgroundImage: 'radial-gradient(circle 50vmax at 50% 50%, rgb(var(--accent) / .22), transparent 75%)',
      }}
    >
      <div ref={cardRef} className="w-full max-w-md will-change-[transform,opacity,filter]">
        {/* Central Luminous Emblem */}
        <div
          ref={emblemRef}
          className="relative size-16 mx-auto mb-6 rounded-2xl border border-white/20 bg-white/[0.05] backdrop-blur-xl flex items-center justify-center shadow-[0_0_35px_rgba(61,139,255,0.35)]"
        >
          <div
            ref={emblemGlowRef}
            className="absolute inset-0 rounded-2xl bg-neon/30 blur-xl scale-75 opacity-75 pointer-events-none"
          />
          <span className="relative flex size-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon opacity-75" />
            <span className="relative inline-flex size-3 rounded-full bg-neon shadow-[0_0_14px_#3d8bff]" />
          </span>
        </div>

        {/* Brand Text */}
        <div className="text-center">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-frost">
            {resume.name}
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm font-medium tracking-widest uppercase text-neon-soft">
            AI &amp; Full-Stack Developer
          </p>
        </div>

        {/* Progress Bar & Status */}
        <div ref={progressBlockRef} className="mt-8">
          <div className="ld-track" role="progressbar" aria-label="Loading" aria-valuemin={0} aria-valuemax={100}>
            <div ref={bar} className="ld-bar" />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs sm:text-sm text-mist" aria-live="polite">
            <span ref={statusRef}>{ready ? 'Ready' : 'Initialising experience…'}</span>
            <span ref={pct} className="tabular-nums font-mono font-medium text-frost">0%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
