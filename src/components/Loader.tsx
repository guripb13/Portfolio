import { useEffect, useRef } from 'react'
import { gsap } from '../lib/gsap'
import { resume } from '../data/resume'
import { getProgress } from '../lib/siteLoad'

interface Props {
  onReady: () => void
  onExited: () => void
}

/* ───────── Tweakable design constants ───────── */
const CX = 100            // centre of the 200x200 drawing
const R = 44              // progress ring radius
const RING_W = 8          // ring thickness
const FAR = 150           // distance the blobs start from (entry)
const CORE = 8            // radius where matter is swallowed (exit)
const ORBIT = 68          // radius the blobs flow around the glass disc
const BREATHE = 0         // how far each blob drifts in/out while loading. 0 = steady circular orbit, so nothing swings toward or away from the centre (try 3-5 to bring the sway back)
const BLOB_R = 7.5        // resting blob radius (circle state)
const ARC = 36            // arc length of a stretched capsule / of the slim line
const TILT = 0            // max tilt of a capsule while loading, in degrees. 0 = the tail always trails straight behind along the orbit, never swings toward the centre
const SPEED = 0.95        // orbit speed, radians per second
const PHASE_SPREAD = 0.35 // small offset between blobs; keep low so all four morph together
const FLOW_CAPSULES = true // false = blobs stay plain circles while loading (no capsule morph at all)

/* entry */
const ENTRY_SECONDS = 1.3 // time for one blob to fly in from far away and settle into orbit
const STAGGER = 0.1      // delay between the four blobs
const SWIRL = 1.6         // extra angle (rad) swept while spiralling in

/* exit: circle -> slim line (approach) -> fast revolve as a line -> dissolve */
const FALL = 1.0       // total exit time of one blob (all three phases)
const EXIT_STAGGER = 0.03 // delay between blobs
const P_APPROACH = 0.35   // fraction of the exit spent coming near the circle and thinning to a line
const P_HOLD_END = 0.65   // fraction where the dissolve starts (between the two: fast revolve as a line)
const NEAR = R + RING_W / 2 + 5 // radius where the lines revolve: 5 units outside the blue ring's outer edge (= 53)
const SLIM_W = 1.5        // width (px) of the slim line (use 1–2)
const SPIN_NEAR = 3.5     // how many times faster the lines revolve near the circle
const SPIN_UP = 1.7       // angular-momentum exponent while falling: spin ~ (NEAR/radius)^SPIN_UP
const SPIN_MAX = 5        // cap on the extra spin from falling inward
const GOO_BLUR = 2.8      // max blur of the liquid dissolve
const GOO_CONTRAST = 13   // alpha contrast of the liquid dissolve (higher = stickier edges)

/* motion blur & device tier */
const IS_LITE =
  typeof window !== 'undefined' &&
  (window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(max-width: 768px)').matches ||
    ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4)

/* gradient per blob: [head, body, tail] */
const GRADS: Array<[string, string, string]> = [
  ['#ff9a8b', '#c74e4e', '#7a2b6e'], // red   -> plum
  ['#8fd3ff', '#4e7ec5', '#5b3fb0'], // blue  -> violet
  ['#f0cfa0', '#c3996c', '#c9638f'], // tan   -> rose
  ['#d5dae2', '#bbbdbf', '#5f8fd6'], // grey  -> sky
]

/* ───────── One-piece ball: round front + body + pointed tail = ONE path, ONE gradient ─────────
   There is no separate circle and no separate tail layer any more, so nothing can overlap.
   The ball itself is the motion: the faster it moves, the longer its own tail gets. */
const TAIL_TIME = 0.25    // seconds of travelled path the tail covers (the "shutter time"); longer = longer tail
const TAIL_MAX_LEN = 40   // cap (viewBox units) so the fast exit spin never draws a full ring
const TAIL_TAPER = 1.15   // shape of the point: 1 = straight cone, higher = sharper needle-like point
const TAIL_V0 = 6         // speed (units/s) where the tail starts to grow...
const TAIL_V1 = 70        // ...and where it is fully formed
const TAIL_STEPS = IS_LITE ? 12 : 22 // points along the tail (more = smoother curve)
const BODY_STEPS = IS_LITE ? 5 : 10  // points along the rounded body
const DOTS = [{}, {}, {}, {}] // one per blob; colours live in GRADS
const GRAD_STOPS = 11    // colour stops per ball; more = a smoother, more even colour change from front to tail tip
const FADE_FROM = 0.25   // where along the ball (0 = front, 1 = tail tip) the tail starts to fade out

/* progress pacing + status text */
const PACE_MS = 2600               // the percentage never fills faster than this, so the entry animation and status words always get to play
const PACE_MS_REDUCED = 900        // shorter wait when the visitor asked for reduced motion
const MSG_MS = 800                 // how long each status word stays before the next one fades in
const MESSAGES = ['Initializing', 'Loading', 'Touching up', 'Polishing'] // loops while loading (keep each under ~12 characters so it fits inside the circle)
const EXIT_DELAY_MS = 380          // how long "Welcome" is held on screen before the exit animation starts
const HARD_CAP_MS = 12000          // the loader can never stay forever
const C = 2 * Math.PI * R

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)
const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1)
const smooth = (t: number) => t * t * (3 - 2 * t)

/* blend two #rrggbb colours */
const mixHex = (a: string, b: string, t: number) => {
  const ca = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
  const cb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
  const c = ca.map((v, i) => Math.round(lerp(v, cb[i], t)))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}

/* ONE continuous, eased colour ramp for the whole ball: head -> body -> tail.
   Every step is eased (smoothstep) so the colour changes equally softly at the front and at the back. */
const rampColor = (g: [string, string, string], t: number) =>
  t < 0.5 ? mixHex(g[0], g[1], smooth(t / 0.5)) : mixHex(g[1], g[2], smooth((t - 0.5) / 0.5))
const RAMP_T = Array.from({ length: GRAD_STOPS }, (_, j) => j / (GRAD_STOPS - 1))

interface BlobState {
  rho: number
  th: number
  vr: number
  wi: number
  h: number
  len: number
  tilt: number
  alpha: number
  E: number
  ready: boolean
  trail: number[]   // past head positions, newest first: [x0,y0,x1,y1,...]
}

declare global {
  interface Window { __bootDone?: () => void }
}

export default function Loader({ onReady, onExited }: Props) {
  const curtainRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const discRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<SVGCircleElement>(null)
  const arcRef = useRef<SVGCircleElement>(null)
  const statusRef = useRef<SVGTextElement>(null)
  const pctRef = useRef<SVGTextElement>(null)
  const srRef = useRef<HTMLSpanElement>(null) // screen-reader only: announces just "Loading" and "Welcome"
  const ringBoxRef = useRef<HTMLDivElement>(null)
  const gooBlurRef = useRef<SVGFEGaussianBlurElement>(null)
  const gooMatRef = useRef<SVGFEColorMatrixElement>(null)
  const gooGroupRef = useRef<SVGGElement>(null)
  const isExiting = useRef(false)

  const readyRef = useRef(onReady)
  const exitedRef = useRef(onExited)
  useEffect(() => {
    readyRef.current = onReady
    exitedRef.current = onExited
  })

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let alive = true
    let raf = 0
    let lastMsg = ''
    let lastPct = -1
    let exitTimer = 0
    let shown = 0
    let best = 0
    let forceDone = false
    const started = performance.now()
    const cleanups: Array<() => void> = []

    let last = performance.now()
    let prevT = last
    const onVis = () => { last = performance.now(); prevT = last }
    document.addEventListener('visibilitychange', onVis)
    cleanups.push(() => document.removeEventListener('visibilitychange', onVis))

    // The Loader is on screen: remove the instant HTML shell (and its slow-network overlay)
    window.__bootDone?.()

    /* Status word inside the circle: the old word fades up and out, then the new one fades in.
       The previous swap is always killed first, so quick changes can never leave a stale word behind. */
    let swapTl: gsap.core.Timeline | null = null
    cleanups.push(() => swapTl?.kill())

    const say = (msg: string) => {
      const el = statusRef.current
      if (!el || msg === lastMsg) return
      const first = lastMsg === ''
      lastMsg = msg
      swapTl?.kill()

      if (reduced) {
        el.textContent = msg
        return
      }
      if (first) {
        el.textContent = msg
        swapTl = gsap.timeline().fromTo(el, { opacity: 0, y: 4 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' })
        return
      }
      swapTl = gsap
        .timeline()
        .to(el, { opacity: 0, y: -4, duration: 0.18, ease: 'power1.in' })
        .add(() => { el.textContent = msg })
        .fromTo(el, { y: 4 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' })
    }

    const S = {
      intro: 0,
      stretch: 0,
      speed: 0,
      exit: 0,
    }
    let T = 0
    let A = 0
    let gooActive = false

    const entryEase = gsap.parseEase('power3.out')
    const growEase = gsap.parseEase('power2.out')
    const fallEase = gsap.parseEase('power3.in')

    const state: BlobState[] = DOTS.map(() => ({
      rho: FAR, th: 0, vr: 0, wi: 0, h: 0, len: 0.001, tilt: 0, alpha: 0, E: 0, ready: false, trail: [],
    }))
    let nodes: SVGPathElement[] = []
    let grads: SVGLinearGradientElement[] = []
    let stops: SVGStopElement[][] = []
    const lit = DOTS.map(() => false)

    const NB = BODY_STEPS
    const NT = TAIL_STEPS
    const NP = NB + NT - 1
    const px = new Float32Array(NP)
    const py = new Float32Array(NP)
    const pw = new Float32Array(NP)
    const tx = new Float32Array(NP)
    const ty = new Float32Array(NP)

    /* Draw every ball as ONE closed outline:
       rounded front -> straight/curved body -> tail that narrows to a point. */
    const drawBlobs = () => {
      for (let i = 0; i < state.length; i++) {
        const o = state[i]
        const el = nodes[i]
        const gr = grads[i]
        if (!el || !gr) continue

        if (o.alpha < 0.01 || o.h < 0.3) {
          if (lit[i]) { el.setAttribute('opacity', '0'); lit[i] = false }
          continue
        }

        const hw = o.h / 2
        const rho = Math.max(o.rho, 0.5)
        const half = o.len / (2 * rho)

        /* how fast the ball moves -> how long its own tail is */
        const vx = o.vr * Math.sin(o.th) + o.rho * o.wi * Math.cos(o.th)
        const vy = -o.vr * Math.cos(o.th) + o.rho * o.wi * Math.sin(o.th)
        const speed = Math.hypot(vx, vy)
        const D = Math.min(TAIL_TIME * speed, TAIL_MAX_LEN) * smooth(clamp01((speed - TAIL_V0) / TAIL_V1))
        const span = D + hw                                  // tail length incl. the round end when there is no tail yet
        const m = smooth(clamp01(D / (hw * 3 + 0.001)))      // 0 = round rear end, 1 = long pointed tail

        /* The HEAD leads. Every other point sits on the path the head already travelled,
           so the body bends and follows the tip instead of sliding sideways. */
        const bodyLen = o.len
        const hx = CX + rho * Math.sin(o.th + half)
        const hy = CX - rho * Math.cos(o.th + half)
        const tr = o.trail
        const n = tr.length / 2

        let seg = 0
        let segStart = 0
        let sx = hx
        let sy = hy
        let ex = n > 0 ? tr[0] : hx
        let ey = n > 0 ? tr[1] : hy
        let segL = Math.hypot(ex - sx, ey - sy)
        let exhausted = n === 0

        for (let j = 0; j < NP; j++) {
          const s = j < NB
            ? (j / (NB - 1)) * bodyLen
            : bodyLen + ((j - NB + 1) / (NT - 1)) * span

          while (!exhausted && segStart + segL < s) {
            segStart += segL
            seg++
            sx = ex
            sy = ey
            if (seg >= n) { exhausted = true; break }
            ex = tr[seg * 2]
            ey = tr[seg * 2 + 1]
            segL = Math.hypot(ex - sx, ey - sy)
          }

          if (!exhausted) {
            const f = segL > 1e-6 ? (s - segStart) / segL : 0
            px[j] = sx + (ex - sx) * f
            py[j] = sy + (ey - sy) * f
          } else {
            const rad = Math.max(Math.hypot(sx - CX, sy - CX), 0.5)
            const a = Math.atan2(sx - CX, CX - sy) - (s - segStart) / rad
            px[j] = CX + rad * Math.sin(a)
            py[j] = CX - rad * Math.cos(a)
          }

          if (j < NB) {
            pw[j] = hw
          } else {
            const u = (j - NB + 1) / (NT - 1)
            const round = Math.sqrt(Math.max(1 - u * u, 0))
            const cone = Math.pow(1 - u, TAIL_TAPER)
            pw[j] = hw * lerp(round, cone, m)
          }
        }

        for (let idx = 0; idx < NP; idx++) {
          const a = Math.max(idx - 1, 0)
          const b = Math.min(idx + 1, NP - 1)
          const dx = px[a] - px[b]
          const dy = py[a] - py[b]
          const dl = Math.hypot(dx, dy)
          if (dl > 1e-4) { tx[idx] = dx / dl; ty[idx] = dy / dl }
          else if (idx > 0) { tx[idx] = tx[idx - 1]; ty[idx] = ty[idx - 1] }
          else { tx[idx] = 1; ty[idx] = 0 }
        }

        /* closed outline */
        const left: string[] = []
        const right: string[] = []
        for (let idx = 0; idx < NP; idx++) {
          const nx = -ty[idx] * pw[idx]
          const ny = tx[idx] * pw[idx]
          left.push(`${(px[idx] + nx).toFixed(1)} ${(py[idx] + ny).toFixed(1)}`)
          right.push(`${(px[idx] - nx).toFixed(1)} ${(py[idx] - ny).toFixed(1)}`)
        }
        const front = left[0]
        const d =
          `M${left.join('L')}L${right.reverse().join('L')}` +
          `A${hw.toFixed(2)} ${hw.toFixed(2)} 0 0 1 ${front}Z`

        const bx = CX + rho * Math.sin(o.th)
        const by = CX - rho * Math.cos(o.th)
        el.setAttribute('d', d)
        el.setAttribute('transform', `rotate(${o.tilt.toFixed(2)} ${bx.toFixed(2)} ${by.toFixed(2)})`)
        el.setAttribute('opacity', o.alpha.toFixed(3))
        lit[i] = true

        /* one gradient, running from the very front of the ball to the tip of its tail.
           Colours are fixed (eased ramp); only the fade-out of the tail changes with speed. */
        gr.setAttribute('x1', (px[0] + tx[0] * hw).toFixed(1))
        gr.setAttribute('y1', (py[0] + ty[0] * hw).toFixed(1))
        gr.setAttribute('x2', px[NP - 1].toFixed(1))
        gr.setAttribute('y2', py[NP - 1].toFixed(1))
        const fade = smooth(clamp01(D / 6))
        const st = stops[i]
        if (st && st.length === GRAD_STOPS) {
          for (let j = 0; j < GRAD_STOPS; j++) {
            const e = smooth(clamp01((RAMP_T[j] - FADE_FROM) / (1 - FADE_FROM)))
            st[j].setAttribute('stop-opacity', (1 - fade * e).toFixed(3))
          }
        }
      }
    }

    const step = (dt: number) => {
      T += dt
      A += S.speed * dt

      for (let i = 0; i < state.length; i++) {
        const o = state[i]

        const p = clamp01((S.intro - i * STAGGER) / ENTRY_SECONDS)
        const near = entryEase(p)
        const grow = growEase(clamp01(p / 0.7))
        const swirl = -SWIRL * Math.pow(1 - smooth(p), 2)

        const q = clamp01((S.exit - i * EXIT_STAGGER) / FALL)
        const approach = smooth(clamp01(q / P_APPROACH))
        const thin = smooth(clamp01(q / (P_APPROACH * 0.7)))
        const fall = fallEase(clamp01((q - P_HOLD_END) / (1 - P_HOLD_END)))

        const k = clamp01(0.5 + 0.95 * Math.sin(T * 1.25 + i * PHASE_SPREAD))
        const sFlow = FLOW_CAPSULES ? smooth(k) * S.stretch : 0
        const s = lerp(sFlow, 1, approach)

        const breathe = Math.sin(T * 1.1 + i * 1.9)
        // While loading the orbit radius stays constant, so the tails follow the circle and are never pulled inward.
        // The inward pull only happens in the exit animation (at 100%), through `approach` and `fall` below.
        const orbitR = ORBIT + breathe * BREATHE * (1 - 0.6 * sFlow) * (1 - approach)
        let rho = lerp(FAR, orbitR, near)
        rho = lerp(rho, NEAR, approach)
        rho = lerp(rho, CORE, fall)

        if (q > 0 && dt > 0) {
          const phaseSpin = lerp(1, SPIN_NEAR, smooth(clamp01(q / (P_HOLD_END * 0.8))))
          const pull = clamp(Math.pow(NEAR / Math.max(rho, CORE), SPIN_UP), 1, SPIN_MAX)
          o.E += (phaseSpin * pull - 1) * S.speed * dt
        }

        const th = A + o.E + (i * Math.PI) / 2 + Math.sin(T * 0.8 + i * 2) * 0.18 * (1 - approach) + swirl

        const r = BLOB_R * grow * (1 + 0.1 * breathe * (1 - approach))
        const full = 2 * r * (1 - 0.18 * sFlow * (1 - approach))
        const melt = 1 - smooth(clamp01((q - P_HOLD_END) / ((1 - P_HOLD_END) * 0.85)))
        const h = Math.max(lerp(full, Math.min(SLIM_W, full), thin) * melt, 0)

        let len = s * ARC * grow
        len = Math.max(Math.min(len, 2 * Math.PI * Math.max(rho, 1) * 0.95), 0.001)

        const tilt = Math.sin(T * 1.4 + i * 1.3) * TILT * sFlow * (1 - approach)

        const gone = smooth(clamp01((q - 0.9) / 0.1))
        const alpha = p > 0 ? 1 - gone : 0

        if (o.ready && dt > 1e-4) {
          const k2 = 1 - Math.exp(-dt * 30)
          o.vr = lerp(o.vr, (rho - o.rho) / dt, k2)
          o.wi = lerp(o.wi, (th - o.th) / dt, k2)
        } else {
          o.vr = 0
          o.wi = 0
        }
        o.ready = true
        o.rho = rho
        o.th = th
        o.h = h
        o.len = len
        o.tilt = tilt
        o.alpha = alpha

        // remember where the tip (head) has been
        {
          const halfA = o.len / (2 * Math.max(o.rho, 0.5))
          o.trail.unshift(
            CX + o.rho * Math.sin(o.th + halfA),
            CX - o.rho * Math.cos(o.th + halfA),
          )
          if (o.trail.length > 240) o.trail.length = 240
        }
      }

      const goo = smooth(clamp01((S.exit - P_HOLD_END * FALL) / (0.6 * FALL)))
      const gooOn = !IS_LITE && goo > 0.001
      if (gooOn !== gooActive) {
        gooActive = gooOn
        if (gooGroupRef.current) {
          if (gooOn) gooGroupRef.current.setAttribute('filter', 'url(#ld-goo)')
          else gooGroupRef.current.removeAttribute('filter')
        }
      }
      if (gooOn) {
        gooBlurRef.current?.setAttribute('stdDeviation', (0.3 + GOO_BLUR * goo).toFixed(1))
        gooMatRef.current?.setAttribute(
          'values',
          `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${lerp(1, GOO_CONTRAST, goo).toFixed(1)} ${lerp(0, -GOO_CONTRAST * 0.37, goo).toFixed(1)}`,
        )
      }

      drawBlobs()
    }

    const tick = () => {
      const now = performance.now()
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      step(dt)
    }

    const INTRO_TOTAL = ENTRY_SECONDS + STAGGER * (DOTS.length - 1)
    const FALL_TOTAL = FALL + EXIT_STAGGER * (DOTS.length - 1)
    const ctx = gsap.context(() => {
      nodes = gsap.utils.toArray<SVGPathElement>('.ld-blob')
      grads = DOTS.map((_d, i) => curtainRef.current!.querySelector<SVGLinearGradientElement>(`#ld-g${i}`)!)
      stops = grads.map((g) => Array.from(g.querySelectorAll<SVGStopElement>('stop')))

      if (reduced) {
        S.intro = INTRO_TOTAL
        S.stretch = 0.5
        S.speed = 0
        step(0)
        gsap.set([trackRef.current, pctRef.current, statusRef.current, discRef.current], { opacity: 1 })
        return
      }

      step(0)
      gsap.ticker.add(tick)

      gsap.set(discRef.current, { opacity: 0, scale: 0.86 })
      gsap
        .timeline()
        .to(S, { intro: INTRO_TOTAL, duration: INTRO_TOTAL, ease: 'none' }, 0.15)
        .to(S, { speed: SPEED, duration: 2.4, ease: 'power2.inOut' }, 0.2)
        .to(S, { stretch: 1, duration: 1.8, ease: 'power2.inOut' }, 1.5)
        .to(discRef.current, { opacity: 1, scale: 1, duration: 1.1, ease: 'power3.out' }, 0.3)
        .to([trackRef.current, pctRef.current], { opacity: 1, duration: 0.8, ease: 'power2.out' }, 0.2)
    }, curtainRef)

    const triggerExit = () => {
      if (isExiting.current) return
      isExiting.current = true
      say('Welcome')
      if (srRef.current) srRef.current.textContent = 'Welcome'

      ctx.add(() => {
        if (reduced) {
          readyRef.current()
          gsap.to(curtainRef.current, { opacity: 0, duration: 0.3, onComplete: () => exitedRef.current() })
          return
        }

        const tl = gsap.timeline({ onComplete: () => exitedRef.current() })
        tl.to(S, { exit: FALL_TOTAL, duration: FALL_TOTAL, ease: 'none' }, 0)
          .to(arcRef.current, { attr: { 'stroke-width': RING_W + 3 }, duration: 0.22, yoyo: true, repeat: 1, ease: 'power1.inOut' }, FALL_TOTAL * 0.82)
          .to(discRef.current, { scale: IS_LITE ? 1.03 : 1.07, duration: 0.5, yoyo: true, repeat: 1, ease: 'power2.inOut' }, FALL_TOTAL * 0.75)
          .addLabel('out', FALL_TOTAL)
          .add(() => readyRef.current(), 'out')
          .to(contentRef.current, {
            y: -44, opacity: 0, scale: 0.96,
            ...(IS_LITE ? {} : { filter: 'blur(14px)' }),
            duration: 0.75, ease: 'power3.inOut', force3D: true,
          }, 'out')
          .to(curtainRef.current, { opacity: 0, duration: 0.65, ease: 'power2.out' }, 'out+=0.4')
      })
    }

    const hardCap = window.setTimeout(() => { forceDone = true }, HARD_CAP_MS)

    const loop = (now: number) => {
      if (!alive) return
      const dt = Math.min((now - prevT) / 1000, 0.1)
      prevT = now

      // REAL progress of the website (code, photos, fonts, layout). The ring never runs ahead of it,
      // and it is also paced (never faster than PACE_MS) so a cached, instant load still looks smooth.
      const elapsed = now - started
      const paced = Math.sin(clamp01(elapsed / (reduced ? PACE_MS_REDUCED : PACE_MS)) * (Math.PI / 2))
      best = Math.max(best, forceDone ? 1 : getProgress())
      const goal = Math.min(best, paced)

      shown += (goal - shown) * (1 - Math.exp(-dt * 9))
      if (goal >= 1 && 1 - shown < 0.003) shown = 1

      const arc = arcRef.current
      if (arc) {
        arc.setAttribute('stroke-dashoffset', `${C * (1 - shown)}`)
        arc.style.opacity = shown > 0.006 ? '1' : '0'
      }

      const pct = Math.round(shown * 100)
      if (pct !== lastPct) {
        lastPct = pct
        if (pctRef.current) pctRef.current.textContent = `${pct}%`
        ringBoxRef.current?.setAttribute('aria-valuenow', String(pct))
      }

      if (shown >= 1) say('Welcome')
      else if (shown > 0.9) say('Almost there')
      else say(MESSAGES[Math.floor(elapsed / MSG_MS) % MESSAGES.length])

      if (shown >= 1) {
        exitTimer = window.setTimeout(() => { if (alive) triggerExit() }, EXIT_DELAY_MS)
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      window.clearTimeout(exitTimer)
      window.clearTimeout(hardCap)
      cleanups.forEach((fn) => fn())
      gsap.ticker.remove(tick)
      ctx.revert()
    }
  }, [])

  return (
    <div
      ref={curtainRef}
      role="region"
      aria-label="Loading portfolio"
      className="fixed inset-0 z-[200] grid place-items-center bg-void px-6 py-10 overflow-hidden pointer-events-auto will-change-[opacity] [min-height:100dvh]"
      style={{
        backgroundImage: 'radial-gradient(circle 50vmax at 50% 50%, rgb(var(--accent) / .22), transparent 75%)',
        height: '100dvh',
        contain: 'layout paint',
        touchAction: 'none',
      }}
    >
      <div ref={contentRef} className="w-full max-w-sm flex flex-col items-center will-change-[transform,opacity,filter]">
        <div
          ref={ringBoxRef}
          role="progressbar"
          aria-label="Website loading progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          className="relative w-[min(58vw,15rem)] aspect-square select-none"
        >
          <svg
            viewBox="0 0 200 200"
            className="absolute inset-0 w-full h-full overflow-visible"
            style={{ zIndex: 1, transform: 'translateZ(0)' }}
            shapeRendering="geometricPrecision"
          >
            <defs>
              <filter
                id="ld-goo"
                filterUnits="userSpaceOnUse"
                x="-90" y="-90" width="380" height="380"
                colorInterpolationFilters="sRGB"
              >
                <feGaussianBlur ref={gooBlurRef} in="SourceGraphic" stdDeviation="0.3" result="blur" />
                <feColorMatrix
                  ref={gooMatRef}
                  in="blur"
                  type="matrix"
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"
                />
              </filter>
            </defs>
            {GRADS.map((g, i) => (
              <linearGradient key={i} id={`ld-g${i}`} gradientUnits="userSpaceOnUse" x1={CX} y1={CX} x2={CX} y2={CX + 1}>
                {RAMP_T.map((t, j) => (
                  <stop key={j} offset={t} stopColor={rampColor(g, t)} stopOpacity="1" />
                ))}
              </linearGradient>
            ))}
            {/* each ball = ONE path (round front + body + pointed tail) */}
            <g ref={gooGroupRef}>
              {DOTS.map((_d, i) => (
                <path key={i} className="ld-blob" data-i={i} d="" fill={`url(#ld-g${i})`} opacity={0} />
              ))}
            </g>
          </svg>

          <div
            ref={discRef}
            className="absolute rounded-full will-change-transform"
            style={{
              zIndex: 0,
              inset: '21%',
              background:
                'linear-gradient(145deg, rgba(255,255,255,.18) 0%, rgba(255,255,255,.05) 45%, rgba(255,255,255,.09) 100%)',
              backdropFilter: IS_LITE ? 'blur(8px)' : 'blur(14px) saturate(170%)',
              WebkitBackdropFilter: IS_LITE ? 'blur(8px)' : 'blur(14px) saturate(170%)',
              boxShadow:
                'inset 0 -14px 26px rgba(0,0,0,.28), inset 0 0 22px rgba(255,255,255,.06), 0 14px 44px rgba(0,0,0,.5)',
            }}
          />

          <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full overflow-visible" style={{ zIndex: 2 }}>
            <defs>
              <linearGradient id="ld-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: 'var(--color-neon-soft, var(--color-neon))' }} />
                <stop offset="100%" style={{ stopColor: 'var(--color-neon)' }} />
              </linearGradient>
            </defs>

            <circle
              ref={trackRef}
              cx={CX} cy={CX} r={R}
              fill="none"
              strokeWidth={RING_W}
              style={{ stroke: 'rgba(255,255,255,.12)', opacity: 0 }}
            />

            <circle
              ref={arcRef}
              cx={CX} cy={CX} r={R}
              fill="none"
              stroke="url(#ld-ring)"
              strokeWidth={RING_W}
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C}
              transform={`rotate(-90 ${CX} ${CX})`}
              style={{ opacity: 0, filter: 'drop-shadow(0 0 6px rgb(var(--accent) / .65))' }}
            />

            {/* Percentage in the middle of the ring */}
            <text
              ref={pctRef}
              x={CX} y={CX - 6}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="23"
              fontWeight="800"
              style={{ opacity: 0, fill: 'var(--color-frost)', fontFamily: '"Bricolage Grotesque", sans-serif', fontVariantNumeric: 'tabular-nums' }}
              aria-hidden="true"
            >
              0%
            </text>

            {/* Looping status word under the percentage ("Initializing", "Touching up"... then "Welcome") */}
            <text
              ref={statusRef}
              x={CX} y={CX + 15}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="9"
              fontWeight="500"
              letterSpacing="0.4"
              style={{ opacity: 0, fill: 'var(--color-mist)', fontFamily: '"Instrument Sans", sans-serif' }}
              aria-hidden="true"
            >
              Initializing
            </text>
          </svg>
        </div>

        {/* Name block. -mt-4 pulls it close to the circle; relative z-10 keeps it above the orbiting balls. */}
        <div className="relative z-10 -mt-4 text-center">
          <p className="text-[11px] sm:text-xs font-medium tracking-[0.22em] uppercase text-neon-soft">Presented by</p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-frost">{resume.name}</h1>
          <span ref={srRef} role="status" className="sr-only">Loading the website</span>
        </div>
      </div>
    </div>
  )
}