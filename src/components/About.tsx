import { useRef } from 'react'
import { gsap, useGSAP } from '../lib/gsap'
import { glideTo } from '../lib/navLock'
import { resume } from '../data/resume'
import GlassCard from './GlassCard'
import Words from './Words'

const { about } = resume

/** Shared card styling. min-w-0 / min-h-0 / overflow-hidden guarantee content can never push a card out of its cell. */
const CARD = 'ab-card glass min-h-0 min-w-0 overflow-hidden p-5 lg:p-[clamp(1rem,2.6svh,1.75rem)]'
const SMALL = 'text-[clamp(0.75rem,1.9svh,0.95rem)] leading-snug'

/**
 * About: bento layout with smooth entrance animation triggered while scrolling the first time,
 * matching the fluid, unpinned flow of the mobile view across desktop, tablet, and phone.
 */
export default function About() {
  const root = useRef<HTMLElement>(null)
  const playedRef = useRef(false) // once true, About is a plain static section for the rest of the visit

  useGSAP(() => {
    const rootEl = root.current
    if (!rootEl) return

    const all = (sel: string) => Array.from(rootEl.querySelectorAll<HTMLElement>(sel))
    const PARTS = '.ab-photo,.ab-word,.ab-line,.ab-chip,.ab-row,.ab-rule'
    const doneCards = new Set<HTMLElement>() // cards already revealed (survives breakpoint rebuilds)

    const setCounts = (scope: ParentNode, final: boolean) =>
      scope.querySelectorAll<HTMLElement>('[data-count]').forEach((n) => {
        n.textContent = final ? (n.dataset.count ?? '') : '0'
      })

    /** Puts one card (and its contents) into its normal, un-animated state */
    const showCard = (card: HTMLElement) => {
      gsap.set([card, ...Array.from(card.querySelectorAll<HTMLElement>(PARTS))], {
        clearProps: 'transform,opacity,scale,clipPath',
      })
      setCounts(card, true)
    }
    const showFinal = () => all('.ab-card').forEach(showCard)

    // Already played, or the user restored a scroll position below the section: never hide anything
    if (playedRef.current || window.scrollY > rootEl.offsetTop + rootEl.offsetHeight) {
      playedRef.current = true
      showFinal()
      return
    }

    /** Adds one card's tweens to a timeline: clean container lift, sharp text, smooth counters */
    const addCard = (tl: gsap.core.Timeline, card: HTMLElement, t: number) => {
      const within = (sel: string) => Array.from(card.querySelectorAll<HTMLElement>(sel))

      // Clean, single lift and fade on the card container itself - NO scale distorting text or glass
      tl.fromTo(
        card,
        { y: 26, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.46, ease: 'power2.out', force3D: true },
        t
      )

      // Photo unmask clipPath (if photo is present in card)
      const photos = within('.ab-photo')
      if (photos.length) {
        tl.fromTo(
          photos,
          { clipPath: 'inset(0% 0% 100% 0% round 16px)' },
          { clipPath: 'inset(0% 0% 0% 0% round 16px)', duration: 0.6, ease: 'power2.out' },
          t + 0.05
        )
      }

      // Title masked words (Intro card) - pure vertical slide inside mask, no competing container transform
      const words = within('.ab-word')
      if (words.length) {
        tl.fromTo(
          words,
          { yPercent: 85, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.45, ease: 'power2.out', stagger: 0.035 },
          t + 0.06
        )
      }

      // Skill chips
      const chips = within('.ab-chip')
      if (chips.length) {
        tl.fromTo(
          chips,
          { scale: 0.75, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.5)', stagger: 0.02 },
          t + 0.1
        )
      }

      // Language rows
      const rows = within('.ab-row')
      if (rows.length) {
        tl.fromTo(
          rows,
          { x: -16, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.38, ease: 'power2.out', stagger: 0.04 },
          t + 0.08
        )
      }

      // Language dividers
      const rules = within('.ab-rule')
      if (rules.length) {
        tl.fromTo(
          rules,
          { scaleX: 0, transformOrigin: 'left center' },
          { scaleX: 1, duration: 0.4, ease: 'power2.out', stagger: 0.04 },
          t + 0.12
        )
      }

      // Number counters: smoothly ticks up from 0 with tabular numbers, zero lateral shake
      within('[data-count]').forEach((c) => {
        const o = { v: 0 }, end = Number(c.dataset.count)
        tl.to(
          o,
          {
            v: end,
            duration: 0.48,
            ease: 'power1.out',
            onUpdate: () => {
              c.textContent = String(Math.round(o.v))
            },
          },
          t + 0.02
        )
      })
    }

    const mm = gsap.matchMedia()

    const getSequence = () => {
      const cardIntro = rootEl.querySelector<HTMLElement>('[data-step="intro"]')
      const cardPortrait = rootEl.querySelector<HTMLElement>('[data-step="portrait"]')
      const cardStat4 = rootEl.querySelector<HTMLElement>('[data-step="stat-4"]')
      const cardStat6 = rootEl.querySelector<HTMLElement>('[data-step="stat-6"]')
      const cardSkills = rootEl.querySelector<HTMLElement>('[data-step="skills"]')
      const cardEdu = rootEl.querySelector<HTMLElement>('[data-step="education"]')
      const cardLang = rootEl.querySelector<HTMLElement>('[data-step="languages"]')
      const cardFocus = rootEl.querySelector<HTMLElement>('[data-step="focus"]')

      return [
        cardIntro,
        cardPortrait,
        cardStat4,
        cardStat6,
        cardSkills,
        cardEdu,
        cardLang,
        cardFocus,
      ].filter(Boolean) as HTMLElement[]
    }

    /* ── Smooth natural scroll reveal (matching phone view across all screens):
          Reveals cards in exact occurrence order. Stat-6 immediately follows Stat-4 without delay. ── */
    const buildFlow = () => {
      if (playedRef.current) { showFinal(); return }
      const sequence = getSequence()
      const cardStat4 = rootEl.querySelector<HTMLElement>('[data-step="stat-4"]')

      sequence.forEach((card) => {
        if (!doneCards.has(card)) setCounts(card, false)
      })

      // Immediate sequence timing: each step starts with zero lag; stat-6 immediately follows stat-4 (+60ms)
      const delays: Record<string, number> = {
        intro: 0,
        portrait: 0,
        'stat-4': 0,
        'stat-6': 0.06,
        skills: 0,
        education: 0,
        languages: 0.05,
        focus: 0,
      }

      sequence.forEach((card) => {
        if (doneCards.has(card)) return
        const step = card.dataset.step ?? ''
        const isStat6 = step === 'stat-6'
        // Pair stat-6 with stat-4's scroll position so it never waits for extra scroll travel
        const triggerEl = isStat6 && cardStat4 ? cardStat4 : card

        const tl = gsap.timeline({
          defaults: { ease: 'power2.out' },
          scrollTrigger: {
            trigger: triggerEl,
            start: 'top 88%',
            once: true,
          },
          onComplete: () => {
            doneCards.add(card)
            if (doneCards.size === sequence.length) {
              playedRef.current = true
            }
          },
        })

        const delay = delays[step] ?? 0
        addCard(tl, card, delay)
      })
    }

    mm.add('(prefers-reduced-motion: no-preference)', buildFlow)
    mm.add('(prefers-reduced-motion: reduce)', showFinal)

    return () => mm.revert()
  }, { scope: root })

  const goLearning = (e: React.MouseEvent) => {
    e.preventDefault()
    glideTo('work')
  }

  return (
    <section id="about" ref={root} className="relative flex min-h-svh flex-col justify-center pb-16 pt-24 lg:pb-10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-12">
        {/* Mobile: 2-col flow · Tablet: portrait beside stats · Desktop (tall): 3-col, 6-row one-screen bento · Desktop (short): same bento at natural height */}
        <div className="about-grid">

          {/* Intro */}
          <div data-step="intro" className={`${CARD} col-span-2 flex flex-col justify-between gap-5 lg:col-span-1 lg:col-start-1 lg:row-span-3 lg:row-start-1 lg:gap-0`}>
            <div>
              <h2 className="ab-head text-[clamp(1.9rem,5.2svh,3.1rem)]"><Words text="A bit about me" /></h2>
              <p className="ab-line mt-[clamp(0.5rem,1.6svh,1rem)] max-w-[44ch] text-[clamp(0.95rem,2.3svh,1.1rem)] leading-relaxed text-mist">{about.summary}</p>
            </div>
            <p className={`ab-line flex items-center gap-2 text-mist ${SMALL}`}>
              <span aria-hidden="true" className="size-2 rounded-full bg-neon shadow-[0_0_10px_rgb(61_139_255)]" />{about.location}
            </p>
          </div>

          {/* Portrait */}
          <GlassCard data-step="portrait" tilt className="ab-card relative col-span-2 aspect-[5/4] min-h-0 w-full min-w-0 overflow-hidden md:col-span-1 md:row-span-2 md:aspect-auto md:min-h-[21rem] lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:min-h-0">
            <div className="ab-photo absolute inset-2.5 overflow-hidden rounded-[1.1rem] bg-black/20 sm:inset-3">
              <img
                src={resume.aboutPhoto}
                alt={`Portrait of ${resume.name}`}
                decoding="async"
                loading="lazy"
                className="h-full w-full object-cover object-top"
              />
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 mix-blend-screen" style={{ background: 'var(--glow-tl)' }} />
            </div>
          </GlassCard>

          {/* Stat 1: 4+ years serving the public at a CSC e-Governance centre */}
          <div
            data-step="stat-4"
            className={`${CARD} col-span-1 flex min-h-[8.5rem] flex-col justify-between gap-3 md:col-start-2 lg:min-h-0 lg:gap-0 lg:col-start-3 lg:row-span-2 lg:row-start-1`}
          >
            <p aria-label={`${about.stats[0].value}${about.stats[0].suffix}`} className="font-display tabular-nums text-[clamp(2.5rem,7svh,5rem)] font-bold leading-none tracking-tight">
              <span aria-hidden="true" data-count={about.stats[0].value}>{about.stats[0].value}</span><span aria-hidden="true">{about.stats[0].suffix}</span>
            </p>
            <p className={`ab-line text-mist ${SMALL}`}>{about.stats[0].label}</p>
          </div>

          {/* Stat 2: 6 certifications and job simulations completed (comes immediately after 4+ years CSC) */}
          <a
            data-step="stat-6"
            href="#work"
            data-cursor
            onClick={(e) => {
              e.preventDefault()
              glideTo('work')
            }}
            aria-label={`View courses and simulations: ${about.stats[1].value}${about.stats[1].suffix} ${about.stats[1].label}`}
            className={`${CARD} group/stat relative col-span-1 flex min-h-[8.5rem] flex-col justify-between gap-3 text-left transition-[border-color,background-color] duration-200 hover:border-white/30 hover:bg-white/[0.08] cursor-pointer md:col-start-2 lg:min-h-0 lg:gap-0 lg:col-start-3 lg:row-span-2 lg:row-start-3`}
          >
            <div className="flex items-start justify-between">
              <p aria-label={`${about.stats[1].value}${about.stats[1].suffix}`} className="font-display tabular-nums text-[clamp(2.5rem,7svh,5rem)] font-bold leading-none tracking-tight">
                <span aria-hidden="true" data-count={about.stats[1].value}>{about.stats[1].value}</span><span aria-hidden="true">{about.stats[1].suffix}</span>
              </p>
              <span
                aria-hidden="true"
                className="flex size-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-mist transition-all duration-300 group-hover/stat:border-white/30 group-hover/stat:bg-white/15 group-hover/stat:text-white group-hover/stat:translate-x-0.5 group-hover/stat:-translate-y-0.5"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7M17 7H7M17 7V17" />
                </svg>
              </span>
            </div>
            <p className={`ab-line text-mist ${SMALL}`}>{about.stats[1].label}</p>
          </a>

          {/* Skills */}
          <div
            id="skills"
            data-step="skills"
            data-skills-section
            className={`${CARD} col-span-2 flex flex-col lg:col-span-1 lg:col-start-1 lg:row-span-3 lg:row-start-4`}
          >
            <h3 className="ab-line font-display text-[clamp(1.1rem,2.6svh,1.4rem)]">What I work with</h3>
            <ul className="mt-[clamp(0.6rem,1.8svh,1rem)] flex flex-wrap content-start gap-1.5 sm:gap-2">
              {resume.skills.map((s) => (
                <li key={s} className="ab-chip rounded-full border border-white/15 bg-white/[0.07] px-2.5 py-0.5 text-[clamp(0.75rem,1.6svh,0.875rem)] transition-colors duration-300 hover:bg-white/[0.14]">{s}</li>
              ))}
            </ul>
          </div>

          {/* Education */}
          <div data-step="education" className={`${CARD} col-span-2 flex flex-col justify-between gap-4 sm:col-span-1 lg:col-start-2 lg:row-span-2 lg:row-start-5 lg:gap-0`}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="ab-line font-display text-[clamp(1.1rem,2.6svh,1.4rem)]">Education</h3>
              <a
                href={about.education.website || 'https://sliet.ac.in/'}
                target="_blank"
                rel="noreferrer noopener"
                data-cursor
                aria-label={`Visit ${about.education.school} official website (opens in new window)`}
                className="ab-line group/edu inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1 text-[clamp(0.7rem,1.6svh,0.8rem)] font-medium text-frost backdrop-blur-md transition-all duration-300 hover:border-white/30 hover:bg-white/[0.16] hover:text-white"
              >
                <span>Official website</span>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform duration-300 group-hover/edu:translate-x-0.5 group-hover/edu:-translate-y-0.5">
                  <path d="M7 17L17 7M17 7H7M17 7V17" />
                </svg>
              </a>
            </div>
            <div>
              <p className="ab-line font-display text-[clamp(1.4rem,3.8svh,1.9rem)] font-bold leading-tight">{about.education.school}</p>
              <p className={`ab-line mt-1 text-mist ${SMALL}`}>{about.education.course}</p>
              <p className={`ab-line ${SMALL}`}>{about.education.period}</p>
            </div>
          </div>

          {/* Languages */}
          <div data-step="languages" className={`${CARD} col-span-2 flex flex-col gap-2 sm:col-span-1 lg:col-start-3 lg:row-span-2 lg:row-start-5 lg:gap-0`}>
            <h3 className="ab-line font-display text-[clamp(1.1rem,2.6svh,1.4rem)]">Languages</h3>
            <ul className="mt-2 flex flex-1 flex-col justify-around">
              {about.languages.map((l, i) => (
                <li key={l.name} className={`ab-row relative flex items-baseline justify-between gap-3 py-1.5 lg:py-1 ${SMALL}`}>
                  <span>{l.name}</span><span className="text-right text-mist">{l.level}</span>
                  {i < about.languages.length - 1 && <span aria-hidden="true" className="ab-rule absolute inset-x-0 bottom-0 h-px bg-white/10" />}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Current focus */}
        <div data-step="focus" className="ab-card glass mt-3 flex flex-col gap-4 p-5 sm:mt-4 sm:flex-row sm:items-center sm:justify-between lg:px-8 lg:py-[clamp(0.9rem,2.4svh,1.5rem)]">
          <div className="min-w-0">
            <h3 className="ab-line font-display text-[clamp(1.25rem,3.2svh,1.9rem)] leading-tight">{about.focus.title}</h3>
            <p className="ab-line mt-1 text-mist">{about.focus.line}</p>
          </div>
          <a href="#work" data-magnetic onClick={goLearning} className="btn w-full shrink-0 justify-center sm:w-auto sm:self-auto">
            {about.focus.cta}
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </a>
        </div>
      </div>
    </section>
  )
}
