import { useEffect, useRef } from 'react'
import { gsap } from '../lib/gsap'

/** Only real elements (cards, buttons) fade the ambient glow. Empty section space must NOT count. */
const HOVER_TARGETS = '.glass, .btn'

/**
 * rgb     : glow colour (a spread of blues)
 * alpha   : peak strength, so keep it low for a subtle look
 * speed   : orbit speed in rad/s (0.05 is about one lap every 2 minutes)
 * r0/rAmp : average orbit radius and how far it wanders, as a fraction of the screen's long side
 * f1/f2   : how fast the radius drifts (two slow waves mixed = looks random, never sharp)
 */
const GLOWS = [
  // 1. Bright blue
  {
    rgb: '61, 139, 255',
    alpha: 0.3,
    speed: 0.052,
    r0: 0.28,
    rAmp: 0.12,
    f1: 0.031,
    f2: 0.047,
    phase: 0,
  },
  // 2. Deep blue
  {
    rgb: '38, 68, 208',
    alpha: 0.34,
    speed: -0.043,
    r0: 0.35,
    rAmp: 0.14,
    f1: 0.027,
    f2: 0.039,
    phase: (2 * Math.PI) / 3,
  },
  // 3. Light cyan-blue
  {
    rgb: '125, 185, 255',
    alpha: 0.25,
    speed: 0.061,
    r0: 0.22,
    rAmp: 0.1,
    f1: 0.035,
    f2: 0.051,
    phase: (4 * Math.PI) / 3,
  },
]

export default function AmbientGlow() {
  const containerRef = useRef<HTMLDivElement>(null)
  const glowRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const glowEls = glowRefs.current

    // Orbit loop driven by GSAP ticker
    const updateOrbit = (time: number) => {
      const w = window.innerWidth
      const h = window.innerHeight
      const cx = w * 0.5
      const cy = h * 0.5
      const longSide = Math.max(w, h)

      for (let i = 0; i < GLOWS.length; i++) {
        const el = glowEls[i]
        if (!el) continue
        const g = GLOWS[i]
        const r = g.r0 + g.rAmp * (Math.sin(time * g.f1) * 0.6 + Math.cos(time * g.f2) * 0.4)
        const angle = g.phase + g.speed * time
        const x = cx + Math.cos(angle) * (r * longSide)
        const y = cy + Math.sin(angle) * (r * longSide)
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`
      }
    }

    if (reduced) {
      // Static position if user prefers reduced motion
      updateOrbit(0)
    } else {
      gsap.ticker.add(updateOrbit)
    }

    // Hover fade logic (only on devices with pointer hover)
    const hasHover = window.matchMedia('(hover: hover)').matches
    let leaveTimer = 0
    let isFadedOut = false

    const handlePointer = (e: MouseEvent) => {
      const target = (e.target as Element | null)?.closest(HOVER_TARGETS)

      if (target) {
        if (leaveTimer) {
          window.clearTimeout(leaveTimer)
          leaveTimer = 0
        }
        if (!isFadedOut) {
          isFadedOut = true
          gsap.to(container, {
            opacity: 0,
            duration: 1.8,
            ease: 'power2.out',
            overwrite: 'auto',
          })
        }
      } else {
        if (isFadedOut && !leaveTimer) {
          // 0.25s delay so moving between neighbouring cards doesn't flicker
          leaveTimer = window.setTimeout(() => {
            isFadedOut = false
            leaveTimer = 0
            gsap.to(container, {
              opacity: 1,
              duration: 1.8,
              ease: 'power2.out',
              overwrite: 'auto',
            })
          }, 250)
        }
      }
    }

    const handleMouseLeave = () => {
      if (isFadedOut && !leaveTimer) {
        leaveTimer = window.setTimeout(() => {
          isFadedOut = false
          leaveTimer = 0
          gsap.to(container, {
            opacity: 1,
            duration: 1.8,
            ease: 'power2.out',
            overwrite: 'auto',
          })
        }, 250)
      }
    }

    if (hasHover) {
      window.addEventListener('mousemove', handlePointer, { passive: true })
      document.addEventListener('mouseleave', handleMouseLeave)
    }

    return () => {
      if (!reduced) {
        gsap.ticker.remove(updateOrbit)
      }
      if (hasHover) {
        window.removeEventListener('mousemove', handlePointer)
        document.removeEventListener('mouseleave', handleMouseLeave)
      }
      if (leaveTimer) {
        window.clearTimeout(leaveTimer)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {GLOWS.map((g, i) => (
        <div
          key={i}
          ref={(el) => {
            glowRefs.current[i] = el
          }}
          className="absolute top-0 left-0 rounded-full pointer-events-none will-change-transform"
          style={{
            translate: '-50% -50%',
            width: 'clamp(540px, 50vw, 850px)',
            height: 'clamp(540px, 50vw, 850px)',
            background: `radial-gradient(circle closest-side, rgba(${g.rgb}, ${g.alpha}) 0%, rgba(${g.rgb}, ${g.alpha * 0.65}) 28%, rgba(${g.rgb}, ${g.alpha * 0.25}) 55%, transparent 75%)`,
          }}
        />
      ))}
    </div>
  )
}
