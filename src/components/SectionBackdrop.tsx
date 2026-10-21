import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { getHoveredProject, subscribeHoveredProject } from '../lib/backdropStore'
import { throttle } from '../lib/perf'

/** ✏️ The dials. Change these numbers only. */
const BACKDROP = {
  opacity: 0.72, // overall strength: 0.3 faint ... 0.8 bold
  blur: 10, // px of blur on the hazy copy: 0 = none, 18 = very soft
  size: 'clamp(20rem, 30vw, 38rem)', // width of the image area (height follows)
  sharpReach: 80, // % of the area where the sharp image fades out (keep 40–100)
  blurReach: 96, // % of the area where the blurry haze fades out (keep ≤ 100)
}

/** ✏️ The corner image appears only when this much of the section is on screen (0.9 = 90%). */
const SHOW_AT = 0.85
const HIDE_BELOW = SHOW_AT - 0.15 // it stays until coverage drops under this (prevents flicker)

interface Scene {
  key: string
  /** Tried in order; if none loads, generated light is shown instead. */
  images?: string[]
  from: string
  to: string
  side: 'left' | 'right'
  /** CSS object-position: where the subject sits inside the crop. */
  position?: string
  /** CSS filter for grading this image. */
  grade?: string
  opacity?: number
}

const NOISE =
  `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`

const DARK_GRADE = 'saturate(.85) contrast(1.08) brightness(.9)'

/** ✏️ Edit scenes here: images, colours, corner. */
function sceneFor(section: string, _hovered?: number | null): Scene | null {
  switch (section) {
    case 'about':
      // The About section has its dedicated background image aligned directly
      // behind the 'A bit about me' section with lowered opacity and background blur.
      return null
    case 'work':
      return null
    case 'experience':
      return null
    case 'contact':
      return {
        key: 'contact',
        images: ['/scenes/contact.jpg'],
        from: '#3d8bff',
        to: '#2846c8',
        side: 'right',
        grade: DARK_GRADE,
      }
    default:
      return null
  }
}

/** The section that is (nearly) fully on screen, or '' while you are in between sections. */
function useSection(): string {
  const [section, setSection] = useState('')
  useEffect(() => {
    const ids = ['about', 'work', 'experience', 'contact']
    let frame = 0
    let settle = 0
    let candidate = ''

    // How much of what COULD be visible of this section is visible (0..1)
    const coverage = (id: string) => {
      const el = document.getElementById(id)
      if (!el) return 0
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      const visible = Math.min(r.bottom, vh) - Math.max(r.top, 0)
      const possible = Math.min(r.height, vh)
      return possible > 0 ? Math.max(visible, 0) / possible : 0
    }

    const measure = () => {
      frame = 0
      const atBottom =
        window.scrollY > 100 &&
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4

      // 1) a section that has reached the threshold wins
      let best = ''
      if (atBottom) {
        best = 'contact'
      } else {
        let bestCoverage = 0
        for (const id of ids) {
          const c = coverage(id)
          if (c >= SHOW_AT && c > bestCoverage) {
            bestCoverage = c
            best = id
          }
        }
      }
      // 2) otherwise keep the current one until it drops clearly below the threshold
      if (!best && candidate && coverage(candidate) >= HIDE_BELOW) best = candidate

      if (best === candidate) return
      candidate = best
      window.clearTimeout(settle)
      settle = window.setTimeout(() => setSection(candidate), 120)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    const onScroll = throttle(schedule, 100)

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', schedule)
      cancelAnimationFrame(frame)
      window.clearTimeout(settle)
    }
  }, [])
  return section
}

/** Used when a scene has no (loadable) photo: soft coloured light + a faint beam, graded like the rest. */
function GeneratedLight({ from, to, ox }: { from: string; to: string; ox: string }) {
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at ${ox} 8%, color-mix(in srgb, ${from} 75%, transparent) 0%, transparent 52%)`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at ${ox === '0%' ? '58%' : '42%'} 40%, color-mix(in srgb, ${to} 55%, transparent) 0%, transparent 46%)`,
        }}
      />
      <div
        className="absolute inset-0 blur-2xl"
        style={{
          background: `linear-gradient(${ox === '0%' ? 118 : 242}deg, transparent 28%, rgb(255 255 255 / .16) 44%, transparent 60%)`,
        }}
      />
    </div>
  )
}

function Layer({ scene, leaving }: { scene: Scene; leaving: boolean }) {
  const [idx, setIdx] = useState(0)
  const src = scene.images?.[idx]
  const left = scene.side === 'left'
  const ox = left ? '0%' : '100%'

  const s = BACKDROP.sharpReach
  const b = BACKDROP.blurReach
  // The face zone (0% to 42% from corner) stays 100% sharp with zero blur.
  // After the face, the sharp image dissolves smoothly into the depth-of-field blur.
  const sharpMask = `radial-gradient(ellipse ${s}% ${s + 4}% at ${ox} 0%, #000 0%, #000 42%, rgb(0 0 0 / .85) 56%, rgb(0 0 0 / .38) 72%, rgb(0 0 0 / .08) 86%, transparent 100%)`
  // The blur is completely transparent over the face (0% to 38%), then blooms in AFTER the face.
  const blurMask = `radial-gradient(ellipse ${b}% ${b}% at ${ox} 0%, transparent 0%, transparent 38%, rgb(0 0 0 / .45) 52%, rgb(0 0 0 / .65) 68%, rgb(0 0 0 / .22) 86%, transparent 100%)`

  const grade = scene.grade ?? DARK_GRADE
  const tint = `linear-gradient(${left ? 135 : 225}deg, color-mix(in srgb, ${scene.from} 55%, transparent) 0%, transparent 65%)`

  const wrap = (mask: string): React.CSSProperties => ({ maskImage: mask, WebkitMaskImage: mask })

  return (
    <div
      className="bd-layer absolute inset-0"
      data-leaving={leaving}
      style={{ '--bd-dx': left ? '-28px' : '28px' } as React.CSSProperties}
    >
      {/* Faint colour wash from the same corner: the background is no longer flat black */}
      <div
        className="bd-wash absolute inset-0"
        style={{
          background: `radial-gradient(circle 55vmax at ${ox} 0%, color-mix(in srgb, ${scene.from} 13%, transparent) 0%, color-mix(in srgb, ${scene.from} 5%, transparent) 45%, transparent 76%)`,
        }}
      />

      <div
        className={`bd-card absolute -top-2 ${left ? '-left-2' : '-right-2'}`}
        style={{ width: BACKDROP.size, aspectRatio: '5 / 6', transformOrigin: `${ox} 0%` }}
      >
        <div className="absolute inset-0" style={{ opacity: scene.opacity ?? BACKDROP.opacity }}>
          {/* Blurred copy (depth of field) */}
          {src && (
            <div className="absolute inset-0 overflow-hidden" style={wrap(blurMask)}>
              <img
                src={src}
                alt=""
                draggable={false}
                className="bd-kenburns absolute inset-0 h-full w-full object-cover"
                style={{
                  objectPosition: scene.position ?? '50% 20%',
                  filter: `${grade} blur(${BACKDROP.blur}px)`,
                  transformOrigin: `${ox} 0%`,
                }}
              />
              <div className="absolute inset-0" style={{ background: tint, mixBlendMode: 'color' }} />
            </div>
          )}

          {/* Sharp copy (or generated light) */}
          <div className="absolute inset-0 overflow-hidden" style={wrap(sharpMask)}>
            {src ? (
              <img
                src={src}
                alt=""
                draggable={false}
                onError={() => setIdx((i) => i + 1)}
                className="bd-kenburns absolute inset-0 h-full w-full object-cover"
                style={{
                  objectPosition: scene.position ?? '50% 20%',
                  filter: grade,
                  transformOrigin: `${ox} 0%`,
                }}
              />
            ) : (
              <GeneratedLight from={scene.from} to={scene.to} ox={ox} />
            )}
            <div className="absolute inset-0" style={{ background: tint, mixBlendMode: 'color' }} />
            <div className="absolute inset-0 opacity-[.13] mix-blend-overlay" style={{ backgroundImage: NOISE }} />
          </div>
        </div>
      </div>
    </div>
  )
}

interface LayerState {
  id: number
  scene: Scene
  leaving: boolean
}

/** Fixed, non-interactive cinematic corner image that changes with the section. Sits behind all content. */
export default function SectionBackdrop({ suspended = false }: { suspended?: boolean }) {
  const section = useSection()
  const hovered = useSyncExternalStore(subscribeHoveredProject, getHoveredProject, () => null)
  const scene = useMemo(() => sceneFor(section, hovered), [section, hovered])

  const [layers, setLayers] = useState<LayerState[]>([])
  const idRef = useRef(0)
  const currentKey = useRef<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const key = scene?.key ?? null
    if (key === currentKey.current) return
    currentKey.current = key
    const id = ++idRef.current
    setLayers((prev) => {
      const next = prev.map((l) => ({ ...l, leaving: true }))
      if (scene) next.push({ id, scene, leaving: false })
      return next
    })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(
      () => setLayers((prev) => prev.filter((l) => !l.leaving)),
      1100,
    )
  }, [scene])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 hidden overflow-hidden transition-opacity duration-500 md:block ${
        suspended ? 'opacity-0' : 'opacity-100'
      }`}
      // screen blend: the black of a photo vanishes into the page, only the light remains
      style={{ zIndex: -1, mixBlendMode: 'screen' }}
    >
      {layers.map((l) => (
        <Layer key={l.id} scene={l.scene} leaving={l.leaving} />
      ))}
    </div>
  )
}
