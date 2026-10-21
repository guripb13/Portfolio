import { useRef } from 'react'
import { gsap, useGSAP } from '../lib/gsap'
import { glideTo } from '../lib/navLock'
import { resume } from '../data/resume'
import { useLiteMode, toggleLite } from '../lib/liteMode'
import GlassCard from './GlassCard'
import ScatterHeading from './ScatterHeading'
import ThemeToggle from './ThemeToggle'

interface HeroProps {
  isAppLoaded?: boolean
}

export default function Hero({ isAppLoaded = true }: HeroProps) {
  const root = useRef<HTMLElement>(null)
  const lite = useLiteMode()

  useGSAP(() => {
    if (!isAppLoaded) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(
        '.hero-fade',
        { y: 26, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.1, stagger: 0.1, delay: 0.15, ease: 'expo.out' }
      )
      gsap.fromTo(
        '.hero-card',
        { y: 60, opacity: 0, scale: 0.94 },
        { y: 0, opacity: 1, scale: 1, duration: 1.3, delay: 0.25, ease: 'expo.out' }
      )
      // The copy dissolves as the story moves on to About
      gsap.to('.hero-copy', {
        opacity: 0,
        y: -90,
        filter: 'blur(10px)',
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: '65% top', scrub: true },
      })
    })
    return () => mm.revert()
  }, { scope: root, dependencies: [isAppLoaded] })

  const jump = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    glideTo(id)
  }

  return (
    <section id="top" ref={root} className="relative min-h-svh overflow-hidden">
      {/* Header bar actions (lines up with the nav pill on desktop, hidden on mobile) */}
      <div className="hidden md:block absolute inset-x-0 top-0 z-20 md:pt-4 pointer-events-none">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 md:px-12">
          <ThemeToggle className="!py-2.5 !px-5 text-sm md:inline-flex" />
          <button
            type="button"
            aria-pressed={lite}
            aria-label="Toggle lite mode"
            data-magnetic
            onClick={toggleLite}
            className="hero-fade btn btn-ghost pointer-events-auto !py-2.5 !px-5 text-sm md:inline-flex border border-white/15 hover:border-white/30 backdrop-blur-md items-center gap-2"
          >
            <span
              className={`inline-block size-1.5 rounded-full transition-colors duration-300 ${
                lite ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-white/40'
              }`}
              aria-hidden="true"
            />
            <span>{lite ? 'Lite mode: On' : 'Lite mode: Off'}</span>
          </button>
        </div>
      </div>

      <div className="hero-copy relative z-10 mx-auto grid min-h-svh max-w-7xl items-center gap-4 px-5 pb-4 pt-16 sm:pt-20 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:gap-8 md:px-12 md:pb-[clamp(4.5rem,10svh,7rem)] md:pt-[clamp(6rem,14svh,9rem)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-12">
        <div className="w-full">
          {/* Availability badge */}
          <div className="hero-fade mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1 text-xs text-mist backdrop-blur-md">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-neon" />
            </span>
            <span className="text-frost font-medium tracking-wide">Available for AI &amp; Software Roles</span>
          </div>

          <ScatterHeading text={resume.headline} />
          <p className="hero-fade mt-2.5 md:mt-[clamp(1rem,3.2svh,2rem)] max-w-[52ch] text-[clamp(0.875rem,2.2svh,1.2rem)] leading-relaxed text-mist">{resume.intro}</p>

          {/* Quick CTAs for mobile */}
          <div className="hero-fade mt-4 flex flex-wrap items-center gap-3 md:hidden">
            <ThemeToggle className="!py-2 !px-4 text-xs font-semibold" />
            <a href="#contact" onClick={(e) => jump(e, 'contact')} className="btn btn-ghost !py-2 !px-4 text-xs border border-white/15">Get in touch</a>
          </div>
        </div>

        {/* Photo + mobile scroll cue container */}
        <div className="flex w-full flex-col items-center md:block">
          {/* Photo: 4:5 glass card with gentle 3D tilt and framed portrait */}
          <GlassCard tilt className="hero-card group mx-auto md:ml-auto md:mr-0 w-[min(100%,calc(var(--hero-fs,clamp(2.75rem,8vw,7.5rem))*5.2),max(14rem,calc((100svh_-_14rem)*0.8)))] p-3">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.1rem] bg-black/20 shadow-inner">
              <img
                src={resume.photo}
                alt={`Portrait of ${resume.name}`}
                decoding="async"
                className="h-full w-full object-cover object-[center_12%] transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 mix-blend-screen transition-opacity duration-500 group-hover:opacity-0" style={{ background: 'var(--glow-tl)' }} />
            </div>
          </GlassCard>

          {/* Scroll cue (mobile: placed directly below the photo card with minimal negative space, non-overlapping) */}
          <div aria-hidden="true" className="hero-fade pointer-events-none flex flex-col items-center gap-1 pt-1.5 pb-1 text-xs text-mist md:hidden">
            <span>Scroll</span>
            <span className="scroll-line !h-5" />
          </div>
        </div>
      </div>

      {/* Scroll cue (desktop & tablet: absolute pinned to bottom of viewport) */}
      <div aria-hidden="true" className="hero-fade pointer-events-none absolute inset-x-0 bottom-6 z-10 hidden flex-col items-center gap-2 text-sm text-mist md:flex">
        <span>Scroll</span>
        <span className="scroll-line" />
      </div>
    </section>
  )
}
