import { useRef } from 'react'
import { gsap, useGSAP } from '../lib/gsap'
import { resume } from '../data/resume'
import GlassCard from './GlassCard'
import ScatterHeading from './ScatterHeading'
import ThemeToggle from './ThemeToggle'

interface HeroProps {
  isAppLoaded?: boolean
}


function Portrait({ className = '', radius }: { className?: string; radius: string }) {
  return (
    <GlassCard tilt className={`hero-card group ${className}`}>
      <div className={`relative aspect-[4/5] overflow-hidden bg-black/20 shadow-inner ${radius}`}>
        <img
          src={resume.photo}
          alt={`Portrait of ${resume.name}`}
          decoding="async"
          className="h-full w-full object-cover object-[center_12%] transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 mix-blend-screen transition-opacity duration-500 group-hover:opacity-0"
          style={{ background: 'var(--glow-tl)' }}
        />
      </div>
    </GlassCard>
  )
}

export default function Hero({ isAppLoaded = true }: HeroProps) {
  const root = useRef<HTMLElement>(null)

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

  return (
    <section id="top" ref={root} className="relative min-h-svh overflow-hidden">
      <div className="hero-copy relative z-10 mx-auto flex min-h-svh max-w-7xl flex-col px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+4.75rem)] sm:px-8 md:grid md:items-center md:gap-8 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:px-12 md:pb-[clamp(4.5rem,10svh,7rem)] md:pt-[clamp(6rem,14svh,9rem)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-12">
        {/* ══════════════ PHONE LAYOUT (below md) ══════════════ */}
        <div className="mb-auto flex flex-col gap-4 pt-2 pb-4 md:hidden">
          {/* Top row: Theme button top-left, Get in touch top-right */}
          <div className="flex items-center justify-between w-full">
            <ThemeToggle className="!py-2 !px-3.5 text-xs" compact />
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('contact')
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' })
                }
              }}
              data-magnetic
              className="hero-fade btn btn-ghost pointer-events-auto !py-2 !px-3.5 text-xs border border-white/15 hover:border-white/30 backdrop-blur-md items-center gap-1.5 text-neutral-900 dark:text-white font-medium"
            >
              <span>Get in touch</span>
              <span>&rarr;</span>
            </button>
          </div>

          <ScatterHeading text={resume.headline} mobileMaxLines={2} />

          <div className="flow-root">
            <Portrait
              radius="rounded-[0.9rem]"
              className="float-right mb-2 ml-3.5 w-[clamp(9.5rem,45vw,14rem)] p-1.5"
            />
            <p className="hero-fade text-sm leading-[1.65] text-mist">{resume.intro}</p>
          </div>
        </div>

        {/* 3. Scroll cue: pinned to the very bottom of the screen */}
        <div
          aria-hidden="true"
          className="hero-fade pointer-events-none flex flex-col items-center gap-1 pt-2 text-xs text-mist md:hidden"
        >
          <span>Scroll</span>
          <span className="scroll-line !h-6" />
        </div>

        {/* ══════════════ TABLET / DESKTOP LAYOUT (md and up): unchanged ══════════════ */}
        <div className="hidden w-full md:block">
          <ScatterHeading text={resume.headline} />
          <p className="hero-fade md:mt-[clamp(1rem,3.2svh,2rem)] max-w-[52ch] md:text-[clamp(0.875rem,2.2svh,1.2rem)] leading-relaxed text-mist">
            {resume.intro}
          </p>
        </div>

        <div className="hidden w-full md:block">
          <Portrait
            radius="rounded-[1.1rem]"
            className="md:ml-auto md:mr-0 w-[min(100%,calc(var(--hero-fs,clamp(2.75rem,8vw,7.5rem))*5.2),max(14rem,calc((100svh_-_14rem)*0.8)))] p-3"
          />
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
