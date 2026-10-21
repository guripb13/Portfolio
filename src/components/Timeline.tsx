import { useRef } from 'react'
import { gsap, ScrollTrigger, useGSAP } from '../lib/gsap'
import { resume } from '../data/resume'
import GlassCard from './GlassCard'

/** Vertical timeline whose gradient line draws itself with scroll; each milestone pops in. */
export default function Timeline() {
  const root = useRef<HTMLElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo('.tl-progress', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.tl-track', start: 'top 60%', end: 'bottom 60%', scrub: true } })
      const cleanups: (() => void)[] = []
      gsap.utils.toArray<HTMLElement>('.tl-item').forEach((item) => {
        gsap.from(item.querySelector('.tl-card'), { opacity: 0, y: 50, scale: 0.92, duration: 0.9, ease: 'back.out(1.5)', scrollTrigger: { trigger: item, start: 'top 82%' } })
        gsap.to(item.querySelector('.tl-dot'), { scale: 1, backgroundColor: '#3d8bff', boxShadow: '0 0 0 6px rgba(61,139,255,.25), 0 0 24px rgba(61,139,255,.9)', duration: 0.5, scrollTrigger: { trigger: item.querySelector('.tl-dot') || item, start: 'center 60%', toggleActions: 'play none none reverse' } })

        const GLOW_MS = 2500
        const card = item.querySelector('.tl-card') as HTMLElement
        const dotEl = item.querySelector('.tl-dot') as HTMLElement
        if (!card || !dotEl) return
        let t = 0

        const playGlow = () => {
          card.classList.add('is-dot-glow')
          window.clearTimeout(t)
          t = window.setTimeout(() => card.classList.remove('is-dot-glow'), GLOW_MS)
        }
        const stopGlow = () => {
          window.clearTimeout(t)
          card.classList.remove('is-dot-glow')
        }

        // Glow starts the moment the whole card is on screen (its bottom edge reaches the bottom of the viewport).
        // The trigger is the <li> (item), not the card: the card is animated with y/scale, which would shift the trigger point.
        ScrollTrigger.create({
          trigger: item,
          start: 'bottom bottom',   // when the bottom of the item hits the bottom of the viewport
          onEnter: playGlow,
          onLeaveBack: stopGlow,
        })
        dotEl.addEventListener('pointerenter', playGlow)
        cleanups.push(() => {
          window.clearTimeout(t)
          card.classList.remove('is-dot-glow')
          dotEl.removeEventListener('pointerenter', playGlow)
        })
      })
      return () => {
        cleanups.forEach((c) => c())
      }
    })
    mm.add('(prefers-reduced-motion: reduce)', () => {
      gsap.set('.tl-progress', { scaleY: 1 })
    })
    return () => mm.revert()
  }, { scope: root })

  return (
    <section id="experience" ref={root} className="relative py-28 md:py-40">
      <div className="mx-auto max-w-5xl px-6 md:px-12">
        <h2 id="experience-heading" className="text-[clamp(2.25rem,5vw,4.25rem)]">Where I've worked</h2>

        <ol className="tl-track relative mt-16 space-y-10 md:space-y-14">
          <div
            data-cursor-line
            className="tl-line absolute bottom-0 left-4 top-0 w-px -translate-x-1/2 bg-white/10 md:left-1/2 before:absolute before:-inset-x-8 before:inset-y-0 before:content-[''] cursor-none"
            aria-hidden="true"
          >
            <div className="tl-progress h-full w-full origin-top bg-neon" />
          </div>

          {resume.experience.map((job, i) => {
            const isRight = i % 2 === 1
            return (
              <li
                key={job.company}
                className={`tl-item relative pl-12 md:w-1/2 md:pl-0 ${
                  isRight ? 'md:ml-auto md:pl-14' : 'md:mr-auto md:pr-14'
                }`}
              >
                <span
                  data-cursor-dot
                  aria-hidden="true"
                  className={`tl-dot ${
                    isRight ? 'tl-dot-right' : 'tl-dot-left'
                  } absolute size-3.5 scale-75 rounded-full border border-white/40 bg-void top-1/2 -mt-[7px] z-10 transition-colors duration-300 before:absolute before:-inset-4 before:rounded-full before:content-['']`}
                />
                <GlassCard className="tl-card p-6 md:p-8">
                  {/* hover glow: crisp orbiting border + soft halo */}
                  <span aria-hidden="true" className="tl-halo" />
                  <span aria-hidden="true" className="tl-ring" />

                  <p className="text-sm text-neon-soft">{job.period}</p>
                  <h3 className="mt-2 text-2xl md:text-3xl">{job.role}</h3>
                  <p className="mt-1 font-medium text-frost/90">{job.company}</p>
                  <p className="mt-4 text-mist">{job.summary}</p>
                </GlassCard>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
