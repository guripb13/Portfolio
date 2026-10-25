import { useEffect, useRef } from 'react'
import { useReducedMotion } from '../lib/useMedia'
import { useTheme } from '../lib/theme'

/**
 * Scatter-text engine: the headline is rasterised, sampled into an exact grid of dots and drawn on a canvas.
 * Each frame every dot is repelled by the pointer and pulled home by a spring.
 * Once settled, dots lock cleanly to grid coordinates so characters stay crisp and aligned.
 *
 * mobileMaxLines: on narrow screens (< 480px) the font shrinks until the headline fits in this many lines.
 *                 Small fonts automatically use a finer dot grid so the letters stay readable.
 */
interface Dot { hx: number; hy: number; x: number; y: number; vx: number; vy: number }

interface Props {
  text: string
  className?: string
  mobileMaxLines?: number
  scale?: number
  justify?:boolean
  bold?: boolean
}

const FONT_FAMILY = '"Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif'
const WEIGHT = 800
const MIN_FIT_SIZE = 13 // never shrink the fitted headline below this (px)

export default function ScatterHeading({ text, className = '', mobileMaxLines, scale = 1, justify = false ,bold = false}: Props) {
  const wrap = useRef<HTMLSpanElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()
  const theme = useTheme()

  useEffect(() => {
    if (reduced) return

    const COLORS = theme === 'light'
      ? ['#0f172a', '#334155', '#64748b', '#94a3b8'] // crisp high-contrast shades for light mode
      : ['#e8eeff', '#a9c9ff', '#6aa5ff', '#3d8bff'] // luminous blues for dark mode

    const host = wrap.current
    const cv = canvas.current
    if (!host || !cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return

    let dots: Dot[] = []
    let bucket = new Uint8Array(0)
    let W = 0, H = 0, R = 120, rad = 2
    let snapGrid = true // snap resting dots to the pixel grid (only when the grid is a clean number)
    let raf = 0, last = 0, alive = true, visible = true, awake = true, lastW = 0
    const ptr = { x: -9999, y: -9999 }

    const setSpacing = (c: CanvasRenderingContext2D) => {
      try {
        if ('letterSpacing' in c) (c as any).letterSpacing = '0.035em'
      } catch {}
    }

    const build = () => {
      const w = Math.floor(host.clientWidth)
      if (w < 50) return // hidden instance (display: none) does nothing
      lastW = w

      const narrow = w < 480

      // Responsive font size capped to avoid vertical blowout
      const base = Math.max(38, Math.min(w * 0.095, 84, window.innerHeight * 0.12)) * scale

      // Greedy word-wrap using the real font metrics
      const m = document.createElement('canvas').getContext('2d')!
      const wrapLines = (sz: number) => {
        m.font = `${WEIGHT} ${sz}px ${FONT_FAMILY}`
        setSpacing(m)
        const out: string[] = []
        let cur = ''
        for (const word of text.split(' ')) {
          const t = cur ? `${cur} ${word}` : word
          if (m.measureText(t).width > w - 8 && cur) {
            out.push(cur)
            cur = word
          } else {
            cur = t
          }
        }
        if (cur) out.push(cur)
        return out
      }

      let size = base
      let lines = wrapLines(size)

      // Phones: shrink the font until the headline fits in the requested number of lines
      if (narrow && mobileMaxLines) {
        size = Math.min(w * 0.11, 40)
        lines = wrapLines(size)
        while (lines.length > mobileMaxLines && size > MIN_FIT_SIZE) {
          size -= 0.5
          lines = wrapLines(size)
        }
      }

      document.documentElement.style.setProperty('--hero-fs', `${size}px`)

      // Generous line-height so descenders never collide with ascenders below
      const lineH = Math.round(size * (narrow ? 1.2 : 1.3))
      const h = Math.ceil(lines.length * lineH + size * 0.2)
      W = w
      H = h
      host.style.height = `${h}px`

      const dpr = Math.min(window.devicePixelRatio || 1, 3)
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(h * dpr)
      cv.style.width = `${w}px`
      cv.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Small text: sample at 4x resolution with a finer grid so thin strokes survive
      const fine = size < 40
      const S = fine ? 4 : 1
      const pitchCss = fine ? size / 14 : Math.max(3, Math.round(size / 20))
      const p = Math.max(fine ? 4 : 3, Math.round(pitchCss * S)) // grid pitch in off-screen pixels (integer)
      const pitch = p / S                                          // grid pitch in CSS pixels
      snapGrid = pitch % 0.5 === 0
      rad = Number((pitch * (bold ? 0.3 : 0.43)).toFixed(2))
      R = Math.max(size * 1.15, 56) // pointer repulsion radius (never tiny on small text)

      // Rasterise the text on an off-screen canvas
      const ow = Math.round(w * S)
      const oh = Math.round(h * S)
      const off = document.createElement('canvas')
      off.width = ow
      off.height = oh
      const o = off.getContext('2d', { willReadFrequently: true })!
      o.font = `${WEIGHT} ${size * S}px ${FONT_FAMILY}`
      o.textBaseline = 'top'
      o.fillStyle = '#ffffff'
      setSpacing(o)
            // Bold: thicken every letter by stroking its outline as well as filling it
      const lw = bold ? size * S * 0.05 : 0
      const pad = lw / 2
      o.strokeStyle = '#ffffff'
      o.lineWidth = lw
      o.lineJoin = 'round'
      const draw = (t: string, x: number, y: number) => {
        o.fillText(t, x + pad, y + pad)
        if (bold) o.strokeText(t, x + pad, y + pad)
      }

      lines.forEach((l, i) => {
        const words = l.split(' ')
        const isLast = i === lines.length - 1
        if (justify && !isLast && words.length > 1) {
          // spread the leftover width evenly between the words
          const target = (w - 2) * S
          const used = words.reduce((sum, wd) => sum + o.measureText(wd).width, 0)
          const gap = (target - used) / (words.length - 1)
          let x = 0
          for (const wd of words) {
            draw(wd, x, i * lineH * S)
            x += o.measureText(wd).width + gap
          }
        } else {
          draw(l, 0, i * lineH * S)
        }
      })

      const data = o.getImageData(0, 0, ow, oh).data

      const next: Dot[] = []
      const COVERAGE = bold ? 0.4 : 0.38  // a dot appears when at least 38% of its cell is covered by the letter
      const cellArea = p * p * 255

      // Look at EVERY pixel of each cell so thin strokes, curves and diagonals are not missed
      for (let cy = 0; cy + p <= oh; cy += p) {
        for (let cx = 0; cx + p <= ow; cx += p) {
          let sum = 0
          for (let yy = cy; yy < cy + p; yy++) {
            const row = yy * ow
            for (let xx = cx; xx < cx + p; xx++) {
              sum += data[(row + xx) * 4 + 3]
            }
          }
          if (sum / cellArea >= COVERAGE) {
            const hx = (cx + p / 2) / S
            const hy = (cy + p / 2) / S
            next.push({ hx, hy, x: hx, y: hy, vx: 0, vy: 0 })
          }
        }
      }

      dots = next
      bucket = new Uint8Array(next.length)
      awake = true
    }

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (!visible) {
        last = now
        return
      }
      const s = Math.min((now - last) / 16.67 || 1, 2.5)
      last = now

      const r = cv.getBoundingClientRect()
      const px = ptr.x - r.left
      const py = ptr.y - r.top
      const near = px > -R && px < W + R && py > -R && py < H + R

      if (!awake && !near) return

      const damp = Math.pow(0.86, s)
      let moving = false

      for (let i = 0; i < dots.length; i++) {
        const d = dots[i]
        let ax = (d.hx - d.x) * 0.058 // spring toward home
        let ay = (d.hy - d.y) * 0.058

        if (near) {
          const dx = d.x - px
          const dy = d.y - py
          const d2 = dx * dx + dy * dy
          if (d2 < R * R) {
            const dist = Math.sqrt(d2) || 1
            const f = 1 - dist / R
            const push = f * f * 5.8
            ax += (dx / dist) * push
            ay += (dy / dist) * push
          }
        }

        d.vx = (d.vx + ax * s) * damp
        d.vy = (d.vy + ay * s) * damp
        d.x += d.vx * s
        d.y += d.vy * s

        const ox = d.x - d.hx
        const oy = d.y - d.hy
        const off2 = ox * ox + oy * oy

        // When not disturbed and within resting tolerance, lock cleanly to the exact grid point
        if (!near && off2 < 0.25 && Math.abs(d.vx) < 0.06 && Math.abs(d.vy) < 0.06) {
          d.x = d.hx
          d.y = d.hy
          d.vx = 0
          d.vy = 0
          bucket[i] = 0
        } else {
          moving = true
          bucket[i] = off2 < 2.25 ? 0 : off2 < 144 ? 1 : off2 < 1600 ? 2 : 3
        }
      }

      awake = moving

      // Clear & batch render dots by colour
      ctx.clearRect(0, 0, W, H)
      for (let c = 0; c < 4; c++) {
        ctx.fillStyle = COLORS[c]
        ctx.beginPath()
        for (let i = 0; i < dots.length; i++) {
          if (bucket[i] !== c) continue
          const d = dots[i]
          // resting dots sit on half-pixel steps (only for clean grids); moving dots stay smooth
          const x = c === 0 && snapGrid ? Math.round(d.x * 2) / 2 : d.x
          const y = c === 0 && snapGrid ? Math.round(d.y * 2) / 2 : d.y
          ctx.moveTo(x + rad, y)
          ctx.arc(x, y, rad, 0, Math.PI * 2)
        }
        ctx.fill()
      }
    }

    const onMove = (e: PointerEvent) => {
      ptr.x = e.clientX
      ptr.y = e.clientY
    }
    const onLeave = () => {
      ptr.x = -9999
      ptr.y = -9999
    }

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
    }, { rootMargin: '100px' })
    io.observe(host)

    let t = 0
    const ro = new ResizeObserver(() => {
      window.clearTimeout(t)
      t = window.setTimeout(() => {
        if (alive && Math.abs(host.clientWidth - lastW) > 1) build()
      }, 120)
    })
    ro.observe(host)

    let lastH = window.innerHeight
    const onResize = () => {
      window.clearTimeout(t)
      t = window.setTimeout(() => {
        if (alive && Math.abs(window.innerHeight - lastH) > 40) {
          lastH = window.innerHeight
          build()
        }
      }, 160)
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)

    // Make sure the web font is fully loaded before measuring and rasterising
    const loadFont = async () => {
      try {
        if (document.fonts) {
          await document.fonts.load(`${WEIGHT} 64px "Bricolage Grotesque"`)
          await document.fonts.ready
        }
      } catch {}
      if (alive) {
        build()
        raf = requestAnimationFrame(tick)
      }
    }
    loadFont()

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      window.clearTimeout(t)
      io.disconnect()
      ro.disconnect()
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [text, reduced, theme, mobileMaxLines,scale,justify,bold])

  return (
    <h1 className={className}>
      <span
        className={
          reduced
            ? 'block font-display text-[clamp(1.35rem,5.6vw,1.9rem)] font-bold leading-[1.18] md:text-[clamp(2.75rem,8vw,7.5rem)]'
            : 'sr-only'
        }
      >
        {text}
      </span>
      {!reduced && (
        <span ref={wrap} aria-hidden="true" className="relative block min-h-[2.5rem] w-full">
          <canvas ref={canvas} className="absolute left-0 top-0 block" />
        </span>
      )}
    </h1>
  )
}
