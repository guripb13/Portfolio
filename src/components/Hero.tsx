import { useRef } from 'react'
import { gsap, useGSAP } from '../lib/gsap'
import { resume } from '../data/resume'
import GlassCard from './GlassCard'
import ScatterHeading from './ScatterHeading'
import ThemeToggle from './ThemeToggle'
import ShareButton from './ShareButton'
interface HeroProps {
  isAppLoaded?: boolean
}

/**
 * Phones turned sideways (short screens, narrower than the tablet layout):
 *  1. Theme and Share leave the content and become round icon buttons at the far left / far right of the
 *     top bar, with the nav pill between them (same look as the tablet/desktop top bar).
 *  2. The whole hero fits ONE screen: text on the left, portrait on the right at full available height,
 *     all sizes scale with the screen height so nothing runs out of the box.
 * (From 768px wide and up, the Navbar draws its own side buttons and the tablet layout is used.)
 */
const LANDSCAPE_CSS = `
.hero-land-btns{display:none}
@media (orientation:landscape) and (max-height:520px) and (max-width:767px){
  /* the in-content button row is replaced by the round buttons in the top bar */
  .hero-btn-row{display:none !important}
  .hero-land-btns{
    display:flex;
    position:absolute;
    z-index:30;
    left:max(1rem,env(safe-area-inset-left));
    right:max(1rem,env(safe-area-inset-right));
    top:calc(env(safe-area-inset-top,0px) + 1rem + 3.5px);
    justify-content:space-between;
    align-items:center;
    pointer-events:none;
  }
  .hero-land-btns > *{pointer-events:auto}

  /* ── One-screen layout: text left, portrait right ── */
  #top{height:100svh !important;min-height:0 !important}
  #top .hero-copy{
    height:100svh !important;
    min-height:0 !important;
    padding-top:calc(env(safe-area-inset-top,0px) + 4.6rem) !important;
    padding-bottom:max(.75rem,env(safe-area-inset-bottom)) !important;
    padding-left:max(1.25rem,env(safe-area-inset-left)) !important;
    padding-right:max(1.25rem,env(safe-area-inset-right)) !important;
  }
  #top .hero-phone{
    display:grid !important;
    grid-template-columns:minmax(0,1.3fr) minmax(0,.7fr);
    grid-template-rows:1fr auto auto auto 1fr;
    column-gap:clamp(1rem,4svh,1.75rem);
    row-gap:clamp(.35rem,2.2svh,.7rem);
    min-height:0;
    padding:0 !important;
  }
  /* text column: vertically centred (rows 2-4 sit between two flexible rows) */
  #top .hero-phone > :nth-child(1){grid-column:1;grid-row:2}
  #top .hero-phone > :nth-child(2){grid-column:1;grid-row:3}
  #top .hero-phone > :nth-child(3){grid-column:1;grid-row:4}
  /* portrait column: full height of the available box, never taller than the screen */
  #top .hero-phone > .hero-card{
    grid-column:2 !important;
    grid-row:1 / -1 !important;
    align-self:stretch;
    height:100% !important;
    min-height:0 !important;
    max-height:none !important;
    margin:0 !important;
    flex:none !important;
  }
  /* text sizes scale with the screen height */
  #top .hero-phone > :nth-child(1){font-size:clamp(.55rem,2.6svh,.7rem) !important}
  #top .hero-phone > :nth-child(2){font-size:clamp(1.15rem,8.2svh,2.1rem) !important;line-height:1.1 !important;margin-top:0 !important}
  #top .hero-phone > :nth-child(3){font-size:clamp(.7rem,3.6svh,.95rem) !important;line-height:1.45 !important}
}
`

function Portrait({ className = '', radius, aspect = 'aspect-[4/5]', fill = false }: { className?: string; radius: string; aspect?: string; fill?: boolean }) {
  return (
    <GlassCard tilt className={`hero-card group ${className}`}>
      <div className={`${fill ? 'absolute inset-0' : `relative ${aspect}`} overflow-hidden bg-black/20 shadow-inner ${radius}`}>
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
      <style>{LANDSCAPE_CSS}</style>

      {/* Phone LANDSCAPE only: round Theme button (far left) and round Share button (far right) beside the nav pill */}
      <div className="hero-land-btns">
        <ThemeToggle className="hdr-btn" />
        <ShareButton className="hdr-btn hero-fade" />
      </div>

      <div className="hero-copy relative z-10 mx-auto flex min-h-svh w-full max-w-7xl flex-col px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+4.75rem)] sm:px-8 md:grid md:items-center md:gap-8 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:px-12 md:pb-[clamp(4.5rem,10svh,7rem)] md:pt-[clamp(6rem,14svh,9rem)] lg:max-w-7xl lg:px-24 lg:grid-cols-[minmax(0,40rem)_auto] lg:justify-center lg:gap-10 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] xl:justify-normal xl:gap-12">
        {/* ══════════════ PHONE LAYOUT (below md) ══════════════
            Portrait view: eyebrow, headline, intro, two buttons, portrait that fills the rest of the screen.
            Landscape view: two columns (text | portrait), see LANDSCAPE_CSS.
            (The "GS" logo and the menu button come from the Navbar.) */}
        <div className="hero-phone flex flex-1 flex-col gap-4 pb-3 pt-3 md:hidden">
          <p className="hero-fade text-[0.7rem] text-center  font-semibold uppercase tracking-[0.22em] text-mist">
            Computer Science <span className="mx-1.5 text-neon-soft">&bull;</span> SLIET
          </p>

          <h1 className="hero-fade -mt-1 text-center font-display text-[clamp(2.1rem,10vw,3.1rem)] font-extrabold leading-[1.02] tracking-tight text-white">
  Blending creative vision<br />
  with an obsession for <span className="text-neon">minor details.</span>
</h1>

          <p className="hero-fade text-[clamp(0.95rem,4vw,1.05rem)] leading-[1.6] text-mist">
            I&rsquo;m <strong className="font-semibold text-white">{resume.name}</strong> &mdash; a computer science student who cares
            about useful products, precise interfaces, and clean engineering.
          </p>

          {/* Portrait view: buttons sit here. Landscape phones hide this row (see LANDSCAPE_CSS). */}
          <div className="hero-fade hero-btn-row grid grid-cols-2 gap-3">
            <ThemeToggle className="!w-full !justify-center !gap-2 !px-3 !py-3 whitespace-nowrap text-sm max-[359px]:!gap-1.5 max-[359px]:text-[0.8rem]" />
            <ShareButton className="!w-full !justify-center !gap-2 !px-3 !py-3 whitespace-nowrap text-sm max-[359px]:!gap-1.5 max-[359px]:text-[0.8rem]" />
          </div>

          {/* The portrait takes whatever height is left, so the page always fills the screen */}
          <Portrait
            fill
            radius="rounded-2xl"
            className="relative mt-1 min-h-[13rem] w-full flex-1 !rounded-2xl p-0 max-h-[30rem]"
          />
        </div>

        {/* ══════════════ TABLET LAYOUT (md → below lg) ══════════════
            Red box   : the dot-matrix headline spans the full width at the top.
            Yellow box: the intro is an "L" – narrow column beside the portrait, then full width underneath.
            Green box : the enlarged portrait floats right, filling the empty cavity of the L. */}
        <div className="hidden w-full md:col-span-2 md:block lg:hidden">
          <ScatterHeading text={resume.headline} scale={0.7} />

          <div className="flow-root md:mt-[clamp(0.75rem,2.4svh,1.5rem)]">
            <Portrait
              radius="rounded-[1.1rem]"
              aspect="aspect-[4/3]"
              className="float-right mb-3 ml-7 w-[clamp(13rem,40vw,26rem)] p-3"
            />
            <p className="hero-fade text-[clamp(1.05rem,2.9vw,1.9rem)] leading-[1.65] text-mist">
              {resume.intro}
            </p>
          </div>
        </div>

        {/* ══════════════ DESKTOP LAYOUT (lg and up): unchanged ══════════════ */}
        <div className="hidden w-full lg:block">
          <ScatterHeading text={resume.headline} />
          <p className="hero-fade lg:mt-[clamp(1rem,3.2svh,2rem)] max-w-[52ch] lg:text-[clamp(0.875rem,2.2svh,1.2rem)] leading-relaxed text-mist">
            {resume.intro}
          </p>
        </div>

        <div className="hidden w-full lg:block">
          <Portrait
            radius="rounded-[1.1rem]"
            className="lg:ml-auto lg:mr-0 w-[clamp(14rem,30vw,20rem)] p-3 xl:w-[min(100%,calc(var(--hero-fs,clamp(2.75rem,8vw,7.5rem))*5.2),max(14rem,calc((100svh_-_14rem)*0.8)))]"
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
