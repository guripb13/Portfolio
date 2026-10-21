import { useEffect, useRef } from 'react'
import { gsap } from '../lib/gsap'
import { throttle } from '../lib/perf'
import { useLiteMode } from '../lib/liteMode'

/* ───────── Tuning knobs ───────── */
const OUTLINE = 'a, button, [role="button"], [data-magnetic]' // ring becomes the BORDER of these
const GROW = '[data-cursor]'  // big surfaces (cards): ring just enlarges instead of wrapping them
const PAD = 6                 // px gap between the element and the ring that wraps it
const GRACE_MS = 150         // after leaving a target, the ring waits this long before returning to the pointer
const BASE = 34               // idle ring diameter
const GROW_SIZE = BASE * 1.22 // steady ring size over [data-cursor] cards (1.1 = subtle, 1.4 = bold)
const HINT_DELAY = 0.7        // seconds the ring stays calm after you land on a card, before the first "click"
const HINT_EVERY = 1.9        // seconds between clicks while you keep hovering
const TAP_DUR = 0.4           // length of one click motion
const TAP_DOWN = 0.1          // how much of that is the fast press-in
const TAP_DEPTH = 0.2         // how far the ring shrinks on press (0.2 = 20% smaller)
const ENABLE_DOT_PULL = false // true = ring snaps to the timeline dots again

export default function CustomCursor() {
  const lite = useLiteMode()
  const glow = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const dot = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = document.documentElement

    // When lite mode is active, completely disable custom cursor and magnetic effects
    if (lite) {
      root.classList.remove('has-cursor')
      document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
        gsap.to(el, { x: 0, y: 0, scale: 1, duration: 0.3, overwrite: 'auto' })
      })
      return
    }

    if (!window.matchMedia('(pointer: fine)').matches) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const g = glow.current!, r = ring.current!, d = dot.current!
    const isMobile = () => window.innerWidth < 768
    if (!isMobile()) root.classList.add('has-cursor')

    const ptr = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const s = { x: ptr.x, y: ptr.y, w: BASE, h: BASE, r: BASE / 2 } // the ring's current (smoothed) state
    let shown = false
    let locked: HTMLElement | null = null // element the ring currently wraps
    let lockedRadius = 0
    let grow = false
    let growSince = 0 // ticker time when the pointer landed on a card
    let timer = 0
    let magnet: HTMLElement | null = null
    let scrollRaf = 0
    // Last dimensions written to the DOM to avoid unnecessary layout recalculation
    let lastW = -1, lastH = -1, lastR = -1

    // Cached DOM lookups: re-query at most every `ttl` ms instead of every frame
    const qc = new Map<string, { el: Element | null; t: number }>()
    const q = <T extends Element>(sel: string, ttl = 800): T | null => {
      const hit = qc.get(sel)
      const now = performance.now()
      if (hit && now - hit.t < ttl && (!hit.el || hit.el.isConnected)) return hit.el as T | null
      const el = document.querySelector<T>(sel)
      qc.set(sel, { el, t: now })
      return el
    }
    let dotsCache: HTMLElement[] = []
    let dotsT = 0
    const getDots = () => {
      const n = performance.now()
      if (n - dotsT > 500) { dotsCache = Array.from(document.querySelectorAll<HTMLElement>('[data-cursor-dot]')); dotsT = n }
      return dotsCache
    }

    gsap.set([g, d], { x: ptr.x, y: ptr.y, opacity: 0 })
    r.style.opacity = '0'

    const gx = gsap.quickTo(g, 'x', { duration: 0.9, ease: 'power3.out' })
    const gy = gsap.quickTo(g, 'y', { duration: 0.9, ease: 'power3.out' })

    const show = (on: boolean) => {
      shown = on
      gsap.to(g, { opacity: on ? 0.9 : 0, duration: 0.4 })
      gsap.to([d, r], { opacity: on ? 1 : 0, duration: 0.3 })
    }

    /* ── lock / release ── */
    const lock = (el: HTMLElement) => {
      window.clearTimeout(timer); timer = 0 // hovering a target cancels any pending return
      if (locked === el) return
      locked = el
      const isExpCard = el.hasAttribute('data-experience-card')
      const cs = getComputedStyle(el)
      const b = el.getBoundingClientRect()
      const raw = cs.borderTopLeftRadius
      const px = raw.endsWith('%') ? (parseFloat(raw) / 100) * Math.min(b.width, b.height) : parseFloat(raw) || 0
      lockedRadius = isExpCard ? px : Math.max(px + PAD, 10)
      r.classList.add('is-locked')
      r.classList.toggle('is-card-locked', isExpCard)
      gsap.to(g, { scale: isExpCard ? 1.05 : 1.45, duration: 1.0, ease: 'power2.out', overwrite: 'auto' })
      gsap.to(d, { scale: isExpCard ? 0.85 : 0.7, duration: 0.5 })
    }
    const release = () => {
      timer = 0
      if (!locked) return
      locked = null
      r.classList.remove('is-locked')
      r.classList.remove('is-card-locked')
      gsap.to(g, { scale: grow ? 1.08 : 1, duration: 1.0, ease: 'power2.out', overwrite: 'auto' })
      gsap.to(d, { scale: 1, duration: 0.5 })
    }
    const scheduleRelease = () => {
      if (locked && !timer) {
        const isExpCard = locked.hasAttribute('data-experience-card')
        timer = window.setTimeout(release, isExpCard ? 40 : GRACE_MS)
      }
    }

    let isGliding = false

    const onGlideStart = () => {
      isGliding = true
      release()
      if (magnet) { releaseMagnet(magnet); magnet = null }
      resetStickiness()
      grow = false
    }

    const onGlideEnd = () => {
      isGliding = false
      // Re-evaluate what is under the cursor after reaching target section and blur is removed
      evaluate(document.elementFromPoint(ptr.x, ptr.y))
    }

    window.addEventListener('nav-glide-start', onGlideStart)
    window.addEventListener('nav-glide-end', onGlideEnd)

    const evaluate = (t: Element | null) => {
      if (isGliding || document.documentElement.hasAttribute('data-nav-gliding')) {
        if (locked) release()
        grow = false
        return
      }
      const el = t?.closest<HTMLElement>(OUTLINE) ?? null
      // Buttons/links get wrapped by the ring. Big cards ([data-cursor]) are skipped here and use the pulse instead.
      if (el && !el.matches(GROW)) { lock(el); grow = false; return }
      scheduleRelease() // not over a target: start the grace window (only if the ring is wrapping something)
      const on = !!t?.closest(GROW)
      if (on !== grow) {
        grow = on
        if (on) growSince = gsap.ticker.time // restart the delay for every new card
        if (!locked) gsap.to(g, { scale: on ? 1.08 : 1, duration: 0.5, ease: 'power3.out', overwrite: 'auto' })
      }
    }

    /* ── magnetic pull (elements with [data-magnetic]) ── */
    const releaseMagnet = (el: HTMLElement) => gsap.to(el, { x: 0, y: 0, scale: 1, duration: 0.9, ease: 'elastic.out(1,0.35)', overwrite: 'auto' })
    const updateMagnet = (e: PointerEvent) => {
      if (isGliding || document.documentElement.hasAttribute('data-nav-gliding')) {
        if (magnet) { releaseMagnet(magnet); magnet = null }
        return
      }
      const el = (e.target as Element | null)?.closest<HTMLElement>('[data-magnetic]') ?? null
      if (el !== magnet) {
        if (magnet) releaseMagnet(magnet)
        magnet = el
        if (magnet) gsap.to(magnet, { scale: 1.04, duration: 0.4, ease: 'power3.out' })
      }
      if (magnet) {
        const b = magnet.getBoundingClientRect()
        const cx = b.left + b.width / 2 - Number(gsap.getProperty(magnet, 'x'))
        const cy = b.top + b.height / 2 - Number(gsap.getProperty(magnet, 'y'))
        gsap.to(magnet, { x: (e.clientX - cx) * 0.3, y: (e.clientY - cy) * 0.3, duration: 0.5, ease: 'power3.out', overwrite: 'auto' })
      }
    }

    /* ── events ── */
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || isMobile()) {
        if (shown) show(false)
        return
      }
      ptr.x = e.clientX; ptr.y = e.clientY
      if (!shown) { show(true); s.x = ptr.x; s.y = ptr.y } // first move: appear at the pointer, no fly-in
      gx(ptr.x); gy(ptr.y)
      gsap.set(d, { x: ptr.x, y: ptr.y })
      updateMagnet(e)
      evaluate(e.target as Element | null)
    }
    // When the page scrolls under a still pointer, no pointer event fires: re-test what is under it.
    const scrollEval = () => {
      if (isGliding || document.documentElement.hasAttribute('data-nav-gliding')) return
      if (scrollRaf || !shown || isMobile()) return
      scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; evaluate(document.elementFromPoint(ptr.x, ptr.y)) })
    }
    const onScroll = throttle(scrollEval, 60)
    const onResize = () => {
      const mobile = isMobile()
      root.classList.toggle('has-cursor', !mobile)
      if (mobile && shown) {
        show(false)
        release()
        if (magnet) { releaseMagnet(magnet); magnet = null }
      }
    }
    let isLineAttracted = false
    let isDotStuck = false
    let isSkillsFlow = false
    let activeDotEl: HTMLElement | null = null
    let stickyDot: HTMLElement | null = null

    const resetStickiness = () => {
      stickyDot = null
      if (isLineAttracted) {
        isLineAttracted = false
        r.classList.remove('is-line-attracted')
      }
      if (isDotStuck) {
        isDotStuck = false
        r.classList.remove('is-dot-stuck')
        if (activeDotEl) {
          activeDotEl.classList.remove('is-stuck')
          activeDotEl = null
        }
      }
      if (isSkillsFlow) {
        isSkillsFlow = false
        r.classList.remove('is-skills-flow')
      }
    }

    const onLeaveDoc = () => {
      show(false)
      window.clearTimeout(timer); release()
      if (magnet) { releaseMagnet(magnet); magnet = null }
      resetStickiness()
    }

    /* ── the ring: one smoothed loop ── */
    const tick = (time: number, dtMs: number) => {
      if (locked && !locked.isConnected) release() // element removed from the page
      const dt = Math.min(dtMs / 1000, 0.05)
      let tx: number, ty: number, tw: number, th: number, tr: number
      let linePull = false
      let dotPull = false
      let activeDot: HTMLElement | null = null

      const isGlidingActive = isGliding || document.documentElement.hasAttribute('data-nav-gliding')

      if (isGlidingActive) {
        if (locked) release()
        if (magnet) { releaseMagnet(magnet); magnet = null }
        resetStickiness()
        grow = false

        // While translating with blur effect: completely disable all interactivity
        tx = ptr.x; ty = ptr.y
        tw = th = BASE
        tr = tw / 2
      } else {
        // Check if project viewer modal is currently open
        const isViewerOpen = !!q('[data-project-viewer-open="true"]', 120)

        // Check if pointer is anywhere within the work section (cards or empty space)
        const workSection = q<HTMLElement>('#work')
        let inWork = false
        if (workSection) {
          const wb = workSection.getBoundingClientRect()
          inWork = ptr.y >= wb.top && ptr.y <= wb.bottom && ptr.x >= wb.left && ptr.x <= wb.right
        }

        // Experience section bounds: strictly activate ONLY when hovering BELOW the "Where I've worked" header
        const expSection = q<HTMLElement>('#experience')
        const expHeader = q<HTMLElement>('#experience-heading') || q<HTMLElement>('#experience h2')
        let inExperience = false
        if (ENABLE_DOT_PULL && !isViewerOpen && !inWork && expSection && expHeader) {
          const hb = expHeader.getBoundingClientRect()
          const eb = expSection.getBoundingClientRect()
          // If hovering pointer below "Where I've worked" header: works. Before it: does NOT work.
          inExperience = ptr.y > hb.bottom && ptr.y <= eb.bottom && ptr.x >= eb.left && ptr.x <= eb.right
        }

        const skillsSection = q<HTMLElement>('[data-skills-section], #skills, [data-step="skills"]')
        let inSkills = false
        if (!isViewerOpen && skillsSection) {
          const sb = skillsSection.getBoundingClientRect()
          // Active when cursor is exploring the skills section/card
          inSkills = ptr.x >= sb.left - 20 && ptr.x <= sb.right + 20 && ptr.y >= sb.top - 20 && ptr.y <= sb.bottom + 20
        }

        if (locked) {
          const b = locked.getBoundingClientRect() // live rect: follows magnet pull, tilt and scrolling
          tx = b.left + b.width / 2; ty = b.top + b.height / 2
          const isExpCard = locked.hasAttribute('data-experience-card')
          const pad = isExpCard ? 0 : PAD
          tw = b.width + pad * 2; th = b.height + pad * 2
          tr = lockedRadius
        } else {
          tx = ptr.x; ty = ptr.y
          tw = th = grow ? GROW_SIZE : BASE
          tr = tw / 2

          if (inExperience) {
            // Division circle stickiness works across the experience milestones below the header
            const dots = getDots()
            let closestDot: HTMLElement | null = null
            let minDotDist = Infinity
            const viewCenterY = window.innerHeight / 2

            for (const dot of dots) {
              const db = dot.getBoundingClientRect()
              const dotY = db.top + db.height / 2
              const dy = Math.abs(viewCenterY - dotY)
              if (dy < minDotDist) {
                minDotDist = dy
                closestDot = dot
              }
            }

            const SWITCH_MARGIN = 40 // px: the new dot must beat the current one by this much
            if (stickyDot && stickyDot.isConnected && stickyDot !== closestDot) {
              const sb = stickyDot.getBoundingClientRect()
              const stickyDist = Math.abs(viewCenterY - (sb.top + sb.height / 2))
              if (stickyDist - minDotDist < SWITCH_MARGIN) closestDot = stickyDot
            }
            stickyDot = closestDot

            if (closestDot) {
              dotPull = true
              activeDot = closestDot
              const db = closestDot.getBoundingClientRect()
              const dotX = db.left + db.width / 2
              const dotY = db.top + db.height / 2
              // Sit precisely centered on the division milestone span
              tx = dotX
              ty = dotY
              tw = th = 32
              tr = 16
            }
          } else {
            stickyDot = null
            if (!isViewerOpen && !inWork) {
              // Outside experience section or before header: never pull line
              const line = q<HTMLElement>('[data-cursor-line]')
              if (line) {
                const lb = line.getBoundingClientRect()
                const lineX = lb.left + lb.width / 2
                const top = lb.top - 16
                const bottom = lb.bottom + 16
                if (ptr.y >= top && ptr.y <= bottom) {
                  const dx = ptr.x - lineX
                  const absDx = Math.abs(dx)
                  const PROXIMITY = 80 // attraction radius (px)
                  if (absDx < PROXIMITY) {
                    linePull = true
                    const norm = 1 - absDx / PROXIMITY
                    // Quadratic-smooth magnetic curve: pulls blue circle onto the division line
                    const pull = Math.pow(norm, 1.35) * 0.90
                    tx = ptr.x - dx * pull
                    tw = th = BASE
                    tr = tw / 2
                  }
                }
              }
            }
          }
        }

        if (isViewerOpen || inWork) {
          dotPull = false
          linePull = false
        }

        if (inSkills !== isSkillsFlow) {
          isSkillsFlow = inSkills
          r.classList.toggle('is-skills-flow', inSkills)
        }

        if (dotPull !== isDotStuck) {
          isDotStuck = dotPull
          r.classList.toggle('is-dot-stuck', dotPull)
          if (activeDotEl) activeDotEl.classList.remove('is-stuck')
          activeDotEl = activeDot
          if (activeDotEl) (activeDotEl as HTMLElement).classList.add('is-stuck')
        }

        if (linePull !== isLineAttracted) {
          isLineAttracted = linePull
          r.classList.toggle('is-line-attracted', linePull)
        }
      }

      if (isGlidingActive) {
        dotPull = false
        linePull = false
        if (isSkillsFlow) {
          isSkillsFlow = false
          r.classList.remove('is-skills-flow')
        }
        if (isDotStuck) {
          isDotStuck = false
          r.classList.remove('is-dot-stuck')
        }
        if (isLineAttracted) {
          isLineAttracted = false
          r.classList.remove('is-line-attracted')
        }
      }

      const m = reduced ? 8 : 1 // reduced motion: snap almost instantly
      const isExpFlow = !isGlidingActive && isDotStuck
      const isCardLocked = !!locked && locked.hasAttribute('data-experience-card')
      const isButtonLocked = !!locked && !isCardLocked
      const speedMult = isGlidingActive ? 1
        : isSkillsFlow ? 0.50
        : isCardLocked ? 0.35     // ring morphing into the experience card border
        : isExpFlow ? 0.40        // ring travelling between timeline dots (was 0.75)
        : 1

      const rateP = isGlidingActive ? 14 : isButtonLocked ? 22 : (locked || dotPull) ? 12 : linePull ? 14 : 12
      const rateS = isGlidingActive ? 14 : isButtonLocked ? 18 : (locked || dotPull) ? 12 : 12

      const kp = 1 - Math.exp(-dt * rateP * speedMult * m)
      const ks = 1 - Math.exp(-dt * rateS * speedMult * m)

      s.x += (tx - s.x) * kp; s.y += (ty - s.y) * kp
      s.w += (tw - s.w) * ks; s.h += (th - s.h) * ks; s.r += (tr - s.r) * ks

      // "Click" hint: fast press-in, springy release. Applied after smoothing so it stays quick and crisp.
      let tap = 1
      if (!isGlidingActive && grow && !locked && !reduced) {
        const e = time - growSince - HINT_DELAY
        if (e >= 0) {
          const p = e % HINT_EVERY
          if (p < TAP_DUR) {
            if (p < TAP_DOWN) {
              const k = p / TAP_DOWN
              tap = 1 - TAP_DEPTH * (1 - Math.pow(1 - k, 3)) // fast ease-out down
            } else {
              const k = (p - TAP_DOWN) / (TAP_DUR - TAP_DOWN)
              const c1 = 2.2, c3 = c1 + 1
              const back = 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2) // springy overshoot
              tap = 1 - TAP_DEPTH + TAP_DEPTH * back
            }
          }
        }
      }
      const w = s.w * tap, h = s.h * tap
      const rad = Math.min(s.r * tap, Math.min(w, h) / 2) // never exceeds a pill/circle while morphing

      // Position: transform is handled on compositor, always write directly for 100% smooth 60/120fps tracking
      r.style.transform = `translate3d(${s.x}px, ${s.y}px, 0)`

      // Size: width/height/border-radius force layout, so only write when they changed
      if (Math.abs(w - lastW) > 0.05 || Math.abs(h - lastH) > 0.05 || Math.abs(rad - lastR) > 0.05) {
        r.style.width = `${w}px`
        r.style.height = `${h}px`
        r.style.borderRadius = `${rad}px`
        lastW = w; lastH = h; lastR = rad
      }
    }
    gsap.ticker.add(tick)

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })
    root.addEventListener('pointerleave', onLeaveDoc)
    return () => {
      gsap.ticker.remove(tick)
      window.clearTimeout(timer)
      cancelAnimationFrame(scrollRaf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('nav-glide-start', onGlideStart)
      window.removeEventListener('nav-glide-end', onGlideEnd)
      root.removeEventListener('pointerleave', onLeaveDoc)
      root.classList.remove('has-cursor')
      resetStickiness()
      gsap.killTweensOf([g, r, d])
      if (magnet) {
        releaseMagnet(magnet)
        magnet = null
      }
      document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
        gsap.to(el, { x: 0, y: 0, scale: 1, duration: 0.3, overwrite: 'auto' })
      })
    }
  }, [lite])

  return (
    <>
      <div ref={glow} className="cursor-glow" aria-hidden="true" style={lite ? { display: 'none' } : undefined} />
      <div ref={ring} className="cursor-ring" aria-hidden="true" style={lite ? { display: 'none' } : undefined} />
      <div ref={dot} className="cursor-dot" aria-hidden="true" style={lite ? { display: 'none' } : undefined} />
    </>
  )
}
