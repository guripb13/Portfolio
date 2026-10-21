import { useEffect, useRef } from 'react'
import { useReducedMotion } from '../lib/useMedia'
import { useTheme } from '../lib/theme'

/**
 * Scatter-text engine: the headline is rasterised, sampled into a grid of dots and drawn on a canvas.
 * Each frame every dot is repelled by the pointer (force falls off with distance) and pulled home by a spring,
 * so text breaks apart under the cursor and elastically re-forms when it leaves.
 *
 * Accessibility: the real heading text stays in the DOM (visually hidden) for screen readers and search engines.
 * With prefers-reduced-motion the canvas is skipped and the heading is shown as ordinary static text.
 */
interface Dot { hx: number; hy: number; x: number; y: number; vx: number; vy: number }

const FONT = '"Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif'

export default function ScatterHeading({ text, className = '' }: { text: string; className?: string }) {
  const wrap = useRef<HTMLSpanElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()
  const theme = useTheme()

  useEffect(() => {
    if (reduced) return
    const COLORS = theme === 'light'
      ? ['#1a1a1a', '#4d4d4d', '#808080', '#b3b3b3'] // Darker shades for light mode
      : ['#e8eeff', '#a9c9ff', '#6aa5ff', '#3d8bff'] // Original settled → far from home
    const host = wrap.current!
    const cv = canvas.current!
    const ctx = cv.getContext('2d')
    if (!ctx) return
    let dots: Dot[] = []
    let bucket = new Uint8Array(0)
    let W = 0, H = 0, R = 120, rad = 2
    let raf = 0, last = 0, alive = true, visible = true, awake = true, lastW = 0
    const ptr = { x: -9999, y: -9999 }

    const build = () => {
      const w = Math.floor(host.clientWidth)
      if (w < 50) return
      lastW = w
      const size = Math.max(40, Math.min(w * 0.105, 96, window.innerHeight * 0.13)) // smaller, and capped by viewport height
      document.documentElement.style.setProperty('--hero-fs', `${size}px`) // the photo card scales with this
      const lineH = size * 0.98

      // Greedy word-wrap using the real font metrics
      const m = document.createElement('canvas').getContext('2d')!
      m.font = `700 ${size}px ${FONT}`
      const lines: string[] = []
      let cur = ''
      for (const word of text.split(' ')) {
        const t = cur ? `${cur} ${word}` : word
        if (m.measureText(t).width > w && cur) { lines.push(cur); cur = word } else cur = t
      }
      lines.push(cur)

      const h = Math.ceil(lines.length * lineH + size * 0.3)
      W = w; H = h
      host.style.height = `${h}px` // canvas is absolutely positioned, so the host height is set here
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      cv.width = w * dpr; cv.height = h * dpr
      cv.style.width = `${w}px`; cv.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Rasterise the text off-screen, then sample it on a regular grid
      const off = document.createElement('canvas')
      off.width = w; off.height = h
      const o = off.getContext('2d', { willReadFrequently: true })!
      o.font = m.font
      o.fillStyle = '#fff'
      lines.forEach((l, i) => o.fillText(l, 0, (i + 0.82) * lineH + size * 0.08))
      const data = o.getImageData(0, 0, w, h).data

      const pitch = Math.max(4, Math.round(size / 15))
      rad = pitch * 0.36
      R = size * 1.15
      const next: Dot[] = []
      for (let y = pitch / 2; y < h; y += pitch) {
        for (let x = pitch / 2; x < w; x += pitch) {
          if (data[((y | 0) * w + (x | 0)) * 4 + 3] > 120) {
            // Start scattered so the headline assembles itself on load
            const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 320
            next.push({ hx: x, hy: y, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, vx: 0, vy: 0 })
          }
        }
      }
      dots = next
      bucket = new Uint8Array(next.length)
      awake = true
    }

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (!visible) { last = now; return }
      const s = Math.min((now - last) / 16.67 || 1, 2.5) // frame-rate independent step
      last = now

      const r = cv.getBoundingClientRect()
      const px = ptr.x - r.left, py = ptr.y - r.top
      const near = px > -R && px < W + R && py > -R && py < H + R
      if (!awake && !near) return

      const damp = Math.pow(0.86, s)
      let moving = false
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i]
        let ax = (d.hx - d.x) * 0.055 // spring toward home
        let ay = (d.hy - d.y) * 0.055
        if (near) {
          const dx = d.x - px, dy = d.y - py, d2 = dx * dx + dy * dy
          if (d2 < R * R) { // pointer repulsion
            const dist = Math.sqrt(d2) || 1, f = 1 - dist / R, push = f * f * 5.5
            ax += (dx / dist) * push; ay += (dy / dist) * push
          }
        }
        d.vx = (d.vx + ax * s) * damp
        d.vy = (d.vy + ay * s) * damp
        d.x += d.vx * s; d.y += d.vy * s
        const ox = d.x - d.hx, oy = d.y - d.hy
        const off2 = ox * ox + oy * oy
        if (off2 > 0.0225 || Math.abs(d.vx) > 0.02 || Math.abs(d.vy) > 0.02) moving = true
        bucket[i] = off2 < 2.25 ? 0 : off2 < 144 ? 1 : off2 < 1600 ? 2 : 3
      }
      awake = moving

      ctx.clearRect(0, 0, W, H)
      for (let c = 0; c < 4; c++) { // 4 batched paths instead of one fill per dot
        ctx.fillStyle = COLORS[c]
        ctx.beginPath()
        for (let i = 0; i < dots.length; i++) {
          if (bucket[i] !== c) continue
          const d = dots[i]
          ctx.moveTo(d.x + rad, d.y)
          ctx.arc(d.x, d.y, rad, 0, Math.PI * 2)
        }
        ctx.fill()
      }
    }

    const onMove = (e: PointerEvent) => { ptr.x = e.clientX; ptr.y = e.clientY }
    const onLeave = () => { ptr.x = ptr.y = -9999 }

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting }, { rootMargin: '100px' })
    io.observe(host)
    let t = 0
    const ro = new ResizeObserver(() => {
      window.clearTimeout(t)
      t = window.setTimeout(() => { if (alive && Math.abs(host.clientWidth - lastW) > 1) build() }, 120)
    })
    ro.observe(host)
    let lastH = window.innerHeight
    const onResize = () => { // height-only resizes do not trigger the ResizeObserver, so handle them here
      window.clearTimeout(t)
      t = window.setTimeout(() => { if (alive && Math.abs(window.innerHeight - lastH) > 40) { lastH = window.innerHeight; build() } }, 160)
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)

    // Wait for the display font so the glyph shapes (and wrapping) are correct
    const ready = document.fonts?.load(`700 64px ${FONT}`).catch(() => undefined) ?? Promise.resolve()
    ready.finally(() => { if (alive) { build(); raf = requestAnimationFrame(tick) } })

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      window.clearTimeout(t)
      io.disconnect(); ro.disconnect()
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [text, reduced, theme])

  return (
    <h1 className={className}>
      <span className={reduced ? 'block font-display text-[clamp(2.75rem,8vw,7.5rem)] font-bold leading-[0.98]' : 'sr-only'}>{text}</span>
      {!reduced && (
        <span ref={wrap} aria-hidden="true" className="relative block min-h-[6rem] w-full">
          <canvas ref={canvas} className="absolute left-0 top-0 block" />
        </span>
      )}
    </h1>
  )
}
