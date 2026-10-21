import { useRef } from 'react'
import { gsap, useGSAP } from '../lib/gsap'
import { resume } from '../data/resume'
import GlassCard from './GlassCard'
import ProjectArt from './ProjectArt'
import { setHoveredProject } from '../lib/backdropStore'

interface ProjectsProps {
  onOpenProject?: (index: number) => void
}

/** Cards shown in the grid. Anything beyond this is reached inside the horizontal viewer (it always contains every project). */
const PREVIEW_MAX = 6

/**
 * The Work section is sized to ONE screen: a 3 x 2 grid that fills the viewport height, so all (up to six)
 * cards are visible at once without scrolling past them. Opening any card slides in the horizontal viewer.
 */
export default function Projects({ onOpenProject }: ProjectsProps) {
  const root = useRef<HTMLElement>(null)
  const previewProjects = resume.projects.slice(0, PREVIEW_MAX)
  const count = previewProjects.length
  const singleRow = count < PREVIEW_MAX // fewer than 6 -> everything in ONE row
  const cols = singleRow ? Math.max(count, 1) : 3 // 6 or more -> 3 x 2 grid

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(
        '.work-card',
        { y: 25, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.08,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: root.current,
            start: 'top 85%',
            once: true,
          },
          clearProps: 'transform,opacity',
        },
      )
    })
    return () => mm.revert()
  }, { scope: root })

  return (
    <section id="work" ref={root} className="relative flex min-h-svh flex-col justify-center py-24">
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 md:px-10 flex flex-col justify-center">
        {/* Header bar */}
        <div className="flex flex-wrap items-end justify-between gap-3 pb-3 sm:pb-5">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-display font-bold text-white tracking-tight">
              Courses &amp; simulations
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-mist max-w-[50ch]">
              A curated overview of coursework, AI implementations, and hands-on job simulations.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {resume.projects.length > PREVIEW_MAX && (
              <button
                type="button"
                onClick={() => onOpenProject?.(0)}
                className="glass glass-pill px-3 py-1 text-xs font-medium text-neon-soft hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>View all {resume.projects.length} projects</span>
                <span>&rarr;</span>
              </button>
            )}
            <span className="text-[11px] sm:text-xs uppercase tracking-wider text-neon-soft font-semibold glass glass-pill px-2.5 py-0.5">
              {resume.projects.length} Highlights
            </span>
          </div>
        </div>

        {/* Dynamic Grid: 1 row when < 6 projects, 3x2 when >= 6; 2 cols on mobile with last odd card spanning full width */}
        <div
          className="mx-auto grid w-full grid-cols-2 gap-3 sm:gap-4 lg:gap-5 md:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))]"
          style={{ '--cols': cols, maxWidth: singleRow && count < 4 ? `${count * 26}rem` : undefined } as React.CSSProperties}
        >
          {previewProjects.map((p, i) => (
            <GlassCard
              key={p.title}
              tilt
              data-cursor
              role="button"
              tabIndex={0}
              onClick={() => onOpenProject?.(i)}
              onPointerEnter={() => setHoveredProject(i)}
              onFocus={() => setHoveredProject(i)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onOpenProject?.(i)
                }
              }}
              className="max-md:last:odd:col-span-2 work-card group cursor-pointer overflow-hidden !rounded-2xl p-2.5 sm:p-3 transition-all duration-300 hover:border-white/30 hover:shadow-[0_12px_36px_rgba(0,0,0,0.45)] flex flex-col justify-between"
              aria-label={`Open details for ${p.title}`}
            >
              <div>
                {/* Art slot: compact aspect ratio so all cards fit cleanly on screen */}
                <div className={`relative w-full overflow-hidden rounded-xl border border-white/10 bg-[#080c1a] ${
                  singleRow ? 'aspect-[16/10] md:aspect-[4/3]' : 'aspect-[16/10] sm:aspect-[16/9]'
                }`}>
                  <ProjectArt p={p} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2">
                    <span className="text-[10px] sm:text-xs font-medium text-white flex items-center gap-1 glass glass-pill px-2 py-0.5">
                      <span>Details</span>
                      <span>&rarr;</span>
                    </span>
                  </div>
                </div>

                {/* Metadata */}
                <div className="mt-2 flex items-center justify-between text-[10px] sm:text-xs text-mist font-mono">
                  <span>{p.year}</span>
                  <span className="truncate max-w-[65%] text-right text-white/60">{p.role}</span>
                </div>

                {/* Title wraps up to two lines cleanly without truncation */}
                <h3 className="mt-1 text-xs sm:text-sm md:text-base font-display font-semibold text-white group-hover:text-neon-soft transition-colors line-clamp-2 leading-snug">
                  {p.title}
                </h3>
              </div>

              {/* Minimal footer summary */}
              <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] sm:text-xs text-mist">
                <span className="truncate max-w-[75%] font-mono text-white/60">
                  {p.stack.slice(0, 2).join(' • ')}
                </span>
                <span className="text-neon-soft group-hover:translate-x-0.5 transition-transform">
                  &rarr;
                </span>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  )
}
