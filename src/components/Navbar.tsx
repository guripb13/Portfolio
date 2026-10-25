import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLenis } from 'lenis/react'
import { gsap, useGSAP } from '../lib/gsap'
import { throttle } from '../lib/perf'
import ThemeToggle from './ThemeToggle'

import ShareButton from './ShareButton'

const links = [
  { id: 'about', label: 'About' },
  { id: 'work', label: 'Work' },
  { id: 'experience', label: 'Experience' },
  { id: 'contact', label: 'Contact' },
]

interface NavbarProps {
  isHidden?: boolean
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

// Minimum and maximum scroll time in seconds.
const MIN_DURATION = 0.8
const MAX_DURATION = 1.8

const NAV_REACH = 90
const BORDER = 1.5
const SNAP_AT = 0.92   // progress at which the neck lets go of the button

interface NavShapeOpts {
  w: number
  h: number
  p: number
  bx: number
  maxDist: number
  outerR: number
  outerBr: number
  inset?: number
}

const f = (n: number) => Number(n.toFixed(2))

/**
 * Builds the SVG path string for the nav pill and emerging Back to Home button.
 * Coordinates are local to the `.nav-shape` container (which has left: -NAV_REACH).
 * Fully separated: pill + circle, sharp join when overlapping.
 */
function navShapePath(opts: NavShapeOpts): string {
  const { w, h, bx, outerR, outerBr, inset = 0 } = opts
  const x0 = NAV_REACH
  const cy = h / 2
  const cx = x0 + h / 2 // cap centre is x0 + h/2 for both
  const dist = cx - bx

  const top = inset
  const bottom = Math.max(top, h - inset)
  const R = Math.max(0, outerR - inset)
  const Br = Math.max(0, outerBr - inset)
  const navRight = Math.max(cx, x0 + w - outerR)

  // Standard nav capsule path (clockwise)
  const pillP = `M ${f(cx)} ${f(top)} L ${f(navRight)} ${f(top)} A ${f(R)} ${f(R)} 0 0 1 ${f(navRight)} ${f(bottom)} L ${f(cx)} ${f(bottom)} A ${f(R)} ${f(R)} 0 0 1 ${f(cx)} ${f(top)} Z`

  // State 1: Button still inside the left cap
  const minDist = outerR - outerBr
  if (dist <= minDist) {
    return pillP
  }

  // Freestanding button circle (clockwise)
  const circleP = `M ${f(bx)} ${f(cy - Br)} A ${f(Br)} ${f(Br)} 0 0 1 ${f(bx)} ${f(cy + Br)} A ${f(Br)} ${f(Br)} 0 0 1 ${f(bx)} ${f(cy - Br)} Z`

  // Fully separated: pill + circle, no neck
  if (dist >= R + Br) {
    return `${pillP} ${circleP}`
  }

  // Overlapping: plain union of the cap circle and the button circle (sharp join, no liquid neck)
  const a = (dist * dist + R * R - Br * Br) / (2 * dist)
  const hh = Math.sqrt(Math.max(0, R * R - a * a))
  const ix = cx - a
  const large = ix > bx ? 1 : 0

  return (
    `M ${f(cx)} ${f(top)} ` +
    `L ${f(navRight)} ${f(top)} ` +
    `A ${f(R)} ${f(R)} 0 0 1 ${f(navRight)} ${f(bottom)} ` +
    `L ${f(cx)} ${f(bottom)} ` +
    `A ${f(R)} ${f(R)} 0 0 1 ${f(ix)} ${f(cy + hh)} ` +
    `A ${f(Br)} ${f(Br)} 0 ${large} 1 ${f(ix)} ${f(cy - hh)} ` +
    `A ${f(R)} ${f(R)} 0 0 1 ${f(cx)} ${f(top)} ` +
    `Z`
  )
}

/** Floating glass pill navigation. Clicking a link blurs the whole screen while it glides to the section. */
export default function Navbar({ isHidden = false }: NavbarProps) {
  const lenis = useLenis()
  const entrance = useRef<HTMLDivElement>(null)
  const nav = useRef<HTMLDivElement>(null)
  const ulRef = useRef<HTMLUListElement>(null)
  const pill = useRef<HTMLSpanElement>(null)
  const veil = useRef<HTMLDivElement>(null)
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({})
  const pillVisible = useRef(false)
  const spyLocked = useRef(false)
  const syncSpy = useRef<() => void>(() => {})
  const lockTimer = useRef<number | undefined>(undefined)
  const animFrame = useRef<number | undefined>(undefined)
  const [active, setActive] = useState('')
  const activeRef = useRef('')
  activeRef.current = active
  const animState = useRef({
    focusX: 50,
    radius: 240,
    focusOpacity: 0,
    baseOpacity: 0.3,
    auraOpacity: 0.22,
    transitSurge: 1.0,
  })
  const isHoveringRef = useRef(false)
  const hoveredButtonRef = useRef<string | null>(null)

  // Mobile detection (< 768px, same breakpoint as custom cursor)
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const on = () => setIsMobile(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  // Back to top live shape stretch & button refs
  const btnWrapperRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const arrowIconRef = useRef<SVGSVGElement>(null)
  const shapeRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const springToRef = useRef<(target: 0 | 1) => void>(() => {})

  // Mobile Back-to-top refs
  const mobileBtn = useRef<HTMLButtonElement>(null)
  const mobileRipple = useRef<HTMLSpanElement>(null)
  const mobileTl = useRef<gsap.core.Timeline | null>(null)

  // Show when active is 'work', 'experience', or 'contact'
  const showTop = active === 'work' || active === 'experience' || active === 'contact'

  // MOBILE ONLY: the back-to-top button appears once the viewport top passes
  // this fraction of the About section (0.5 = 50%). Change to 0.3, 0.7, etc. to tune.
  const MOBILE_ABOUT_TRIGGER = 0.5
  const [mobileShowTop, setMobileShowTop] = useState(false)

  useEffect(() => {
    if (!isMobile) {
      setMobileShowTop(false)
      return
    }

    let frame = 0
    const update = () => {
      frame = 0
      const about = document.getElementById('about')
      if (!about) return
      const rect = about.getBoundingClientRect()
      const aboutTop = rect.top + window.scrollY
      const triggerY = aboutTop + rect.height * MOBILE_ABOUT_TRIGGER
      setMobileShowTop(window.scrollY >= triggerY)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      cancelAnimationFrame(frame)
    }
  }, [isMobile])

  // Entrance animation (runs on its own wrapper so other nav animations can't kill it)
  useGSAP(() => {
    const el = entrance.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(el, { y: 0, opacity: 1 })
      return
    }
    gsap.fromTo(
      el,
      { y: -30, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.8,
        delay: 0.15,
        ease: 'expo.out',
        clearProps: 'transform,opacity',
      },
    )
  }, { scope: entrance })

  // DESKTOP: live nav-shape stretch and button emerge effect (>= 768px only)
  useEffect(() => {
    if (isMobile) return
    const host = shapeRef.current
    const body = bodyRef.current
    const wrap = btnWrapperRef.current
    const btn = buttonRef.current
    const arrow = arrowIconRef.current
    if (!host || !body || !wrap || !btn) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const big = window.innerWidth >= 640
    const r = big ? 22 : 18
    const D = big ? 58 : 50 // final distance from the nav

    const s = { p: 0, v: 0, target: 0 as 0 | 1 }
    let raf = 0
    let last = 0
    let interactive = false
    let glowTimer = 0
    let lastPathKey = ''

    let navW = body.offsetWidth || 400
    let navH = body.offsetHeight || 48

    const clipEls = host.querySelectorAll<HTMLElement>('[data-clip]')

    const playGlow = () => {
      if (reduced) return
      btn.classList.remove('is-glow')
      void btn.offsetWidth // restart the animation
      btn.classList.add('is-glow')
      window.clearTimeout(glowTimer)
      glowTimer = window.setTimeout(() => btn.classList.remove('is-glow'), 2400)
    }
    const stopGlow = () => {
      window.clearTimeout(glowTimer)
      btn.classList.remove('is-glow')
    }

    wrap.style.transformOrigin = 'center center'

    const render = () => {
      const p = s.p
      const scale = 0.6 + 0.4 * Math.min(p, 1.05)

      // Direct transform for button wrapper
      wrap.style.transform = `translate3d(${-D * p}px, 0, 0) scale(${scale})`
      // Fade the whole button (background, ring, arrow) so it is fully invisible while hidden behind the nav
      const wrapOpacity = clamp((p - 0.15) / 0.45, 0, 1)
      wrap.style.opacity = wrapOpacity.toFixed(3)
      wrap.style.visibility = wrapOpacity === 0 ? 'hidden' : 'visible'
      // Smooth Hermite interpolation for arrow opacity and subtle drift
      const arrowProgress = clamp((p - 0.32) / 0.48, 0, 1)
      const arrowT = arrowProgress * arrowProgress * (3 - 2 * arrowProgress)
      if (arrow) {
        arrow.style.opacity = String(arrowT)
        arrow.style.transform = `translate3d(0, ${(5 * (1 - arrowT)).toFixed(2)}px, 0)`
      }

      // Geometry coordinates
      const bx = NAV_REACH + r - D * p
      const maxDist = navH / 2 - r + D * SNAP_AT
      const outerR = navH / 2
      const outerBr = r * scale

      // Skip path rebuild when key hasn't changed
      const clipKey = `${p.toFixed(4)}|${navW}|${navH}`
      if (clipKey !== lastPathKey) {
        lastPathKey = clipKey
        const outer = navShapePath({ w: navW, h: navH, p, bx, maxDist, outerR, outerBr, inset: 0 })
        const inner = navShapePath({ w: navW, h: navH, p, bx, maxDist, outerR, outerBr, inset: BORDER })
        const outerVal = `path("${outer}")`
        const innerVal = `path("${inner}")`
        const ringVal = `path(evenodd, "${outer} ${inner}")`

        clipEls.forEach((el) => {
          const kind = el.getAttribute('data-clip')
          const val = kind === 'outer' ? outerVal : kind === 'inner' ? innerVal : ringVal
          el.style.clipPath = val
          el.style.setProperty('-webkit-clip-path', val)
        })
      }

      host.classList.add('is-ready')

      const on = s.target === 1 && p > 0.7
      if (on !== interactive) {
        interactive = on
        wrap.style.pointerEvents = on ? 'auto' : 'none'
        btn.style.pointerEvents = on ? 'auto' : 'none'
        btn.tabIndex = on ? 0 : -1
        btn.setAttribute('aria-hidden', on ? 'false' : 'true')
      }
    }

    const frame = (now: number) => {
      const dt = Math.min(Math.max((now - last) / 1000, 0), 1 / 30)
      last = now
      const showing = s.target === 1
      // emerge: k = 170, c = 2 * 0.78 * sqrt(170) (~2% overshoot)
      // swallow: k = 210, c = 2 * sqrt(210) (critically damped absorption)
      const k = showing ? 170 : 210
      const c = showing ? 2 * 0.78 * Math.sqrt(170) : 2 * Math.sqrt(210)
      const steps = 6
      const h = dt / steps
      for (let i = 0; i < steps; i++) {
        s.v += (-k * (s.p - s.target) - c * s.v) * h
        s.p += s.v * h
      }
      if (s.target === 0 && s.p < 0) {
        s.p = 0
        s.v = 0
      }
      render()

      if (Math.abs(s.p - s.target) < 0.0004 && Math.abs(s.v) < 0.006) {
        s.p = s.target
        s.v = 0
        render()
        host.classList.remove('is-moving')
        if (s.target === 1) playGlow()
        raf = 0
        return
      }
      raf = requestAnimationFrame(frame)
    }

    springToRef.current = (t) => {
      if (t === 0) stopGlow()
      s.target = t
      if (reduced) {
        s.p = t
        s.v = 0
        render()
        if (t === 1) playGlow()
        return
      }
      host.classList.add('is-moving')
      if (!raf) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }

    // Measure nav body dimensions using offsetWidth & offsetHeight
    const measure = () => {
      const w = body.offsetWidth
      const h = body.offsetHeight
      if (w > 0 && h > 0 && (w !== navW || h !== navH)) {
        navW = w
        navH = h
        render()
      }
    }

    const ro = new ResizeObserver(measure)
    ro.observe(body)

    render() // initial render

    return () => {
      ro.disconnect()
      if (raf) cancelAnimationFrame(raf)
      stopGlow()
      host.classList.remove('is-moving')
      springToRef.current = () => {}
    }
  }, [isMobile])

  // MOBILE: paint the dark glass surface + thin border ring as a plain static pill (the desktop effect never runs on mobile)
  useEffect(() => {
    if (!isMobile) return
    const host = shapeRef.current
    const body = bodyRef.current
    if (!host || !body) return

    const clipEls = host.querySelectorAll<HTMLElement>('[data-clip]')

    const apply = () => {
      const w = body.offsetWidth
      const h = body.offsetHeight
      if (!w || !h) return
      // bx puts the (unused) button exactly on the left cap, so navShapePath returns a plain pill
      const base = { w, h, p: 0, bx: NAV_REACH + h / 2, maxDist: 0, outerR: h / 2, outerBr: 0 }
      const outer = navShapePath({ ...base, inset: 0 })
      const inner = navShapePath({ ...base, inset: BORDER })
      clipEls.forEach((el) => {
        const kind = el.getAttribute('data-clip')
        const val =
          kind === 'outer' ? `path("${outer}")`
          : kind === 'inner' ? `path("${inner}")`
          : `path(evenodd, "${outer} ${inner}")`
        el.style.clipPath = val
        el.style.setProperty('-webkit-clip-path', val)
      })
      host.classList.add('is-ready')
    }

    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(body)
    return () => ro.disconnect()
  }, [isMobile])

  // DESKTOP: drive the spring. Show instantly, hide after a tiny delay so scroll-spy flicker can't make it flap.
  useEffect(() => {
    if (isMobile) return
    const id = window.setTimeout(() => springToRef.current(showTop ? 1 : 0), showTop ? 0 : 90)
    return () => window.clearTimeout(id)
  }, [showTop, isMobile])

  // MOBILE: Build fluid bottom-center emergence timeline (< 768px)
  useEffect(() => {
    if (!isMobile || !mobileBtn.current) return
    const btn = mobileBtn.current
    const ripple = mobileRipple.current
    const icon = btn.querySelector('svg')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const tl = gsap.timeline({ paused: true })

    if (reduced) {
      gsap.set(btn, { autoAlpha: 0 })
      tl.to(btn, { autoAlpha: 1, duration: 0.25, ease: 'power1.out' })
    } else {
      // starts hidden, below its resting place, squashed small like a drop at the bottom edge
      gsap.set(btn, { autoAlpha: 0, y: 70, scaleX: 0.5, scaleY: 0.5, transformOrigin: '50% 100%' })
      if (icon) gsap.set(icon, { y: 10, opacity: 0 })

      tl
        // 1. fade in quickly while rising
        .to(btn, { autoAlpha: 1, duration: 0.25, ease: 'power1.out' }, 0)
        // 2. fluid rise: stretched tall and thin, like a drop being pulled upward
        .to(btn, { y: -10, scaleX: 0.82, scaleY: 1.32, duration: 0.45, ease: 'power3.out' }, 0)
        // 3. heavy, syrupy settle with a wobble
        .to(btn, { y: 0, scaleX: 1, scaleY: 1, duration: 0.75, ease: 'elastic.out(1, 0.42)' }, 0.45)
      // 4. arrow slides up into place
      if (icon) {
        tl.to(icon, { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out' }, 0.5)
      }
      // 5. glass ripple ring on landing (the "border" accent)
      if (ripple) {
        tl.fromTo(ripple, { scale: 1, opacity: 0.55 }, { scale: 1.9, opacity: 0, duration: 0.6, ease: 'power2.out' }, 0.62)
      }
    }

    mobileTl.current = tl
    if (mobileShowTop) {
      tl.progress(1)
    }
    return () => {
      tl.kill()
      mobileTl.current = null
    }
  }, [isMobile])

  // MOBILE: Drive timeline from mobileShowTop
  useEffect(() => {
    const tl = mobileTl.current
    if (!isMobile || !tl) return
    if (mobileShowTop) {
      tl.timeScale(1).play()
    } else {
      tl.timeScale(1.3).reverse()
    }
  }, [mobileShowTop, isMobile])

  const unlockSpy = useCallback(() => {
    if (lockTimer.current !== undefined) {
      window.clearTimeout(lockTimer.current)
      lockTimer.current = undefined
    }
    spyLocked.current = false
    syncSpy.current()
  }, [])

  const lockSpy = useCallback((durationMs = 1500) => {
    if (lockTimer.current !== undefined) {
      window.clearTimeout(lockTimer.current)
    }
    spyLocked.current = true
    lockTimer.current = window.setTimeout(() => {
      spyLocked.current = false
      lockTimer.current = undefined
      syncSpy.current()
    }, durationMs)
  }, [])

    // Applies blur (and a dark tint in dark mode only) to the fixed backdrop veil during glides
  const applyVeil = useCallback((progress: number, maxBlurPx: number) => {
    if (!veil.current) return
    const style = veil.current.style as CSSStyleDeclaration & { webkitBackdropFilter?: string }
    if (progress <= 0.001) {
      style.backdropFilter = 'none'
      if ('webkitBackdropFilter' in style) style.webkitBackdropFilter = 'none'
      style.backgroundColor = 'transparent'
      style.opacity = '0'
      return
    }

    const blurPx = Math.round(progress * maxBlurPx * 10) / 10
    const filterVal = `blur(${blurPx}px)`
    style.backdropFilter = filterVal
    if ('webkitBackdropFilter' in style) style.webkitBackdropFilter = filterVal

    // Light mode: blur only, no dark tint. Dark mode: keep the original dark tint.
    const isLight = document.documentElement.getAttribute('data-theme') === 'light'
    style.backgroundColor = isLight
      ? 'transparent'
      : `rgba(0, 0, 0, ${(progress * 0.3).toFixed(3)})`
    style.opacity = '1'
  }, [])

  // Sliding glass indicator pill update
  const updatePillPosition = useCallback((animate = true) => {
    const currentActive = activeRef.current
    const pillEl = pill.current
    const ulEl = ulRef.current

    if (!pillEl || !ulEl) return

    if (!currentActive || !linkRefs.current[currentActive]) {
      if (pillVisible.current) {
        pillVisible.current = false
        gsap.to(pillEl, {
          opacity: 0,
          duration: 0.25,
          ease: 'power2.out',
        })
      }
      return
    }

    const targetEl = linkRefs.current[currentActive]
    const targetRect = targetEl.getBoundingClientRect()
    const ulRect = ulEl.getBoundingClientRect()

    const left = targetRect.left - ulRect.left
    const top = targetRect.top - ulRect.top
    const width = targetRect.width
    const height = targetRect.height

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!animate || prefersReduced) {
      pillVisible.current = true
      gsap.set(pillEl, {
        x: left,
        y: top,
        width,
        height,
        opacity: 1,
        filter: 'blur(0px)',
      })
      return
    }

    if (!pillVisible.current) {
      pillVisible.current = true
      gsap.set(pillEl, {
        x: left,
        y: top,
        width,
        height,
        filter: 'blur(0px)',
      })
      gsap.to(pillEl, {
        opacity: 1,
        duration: 0.25,
        ease: 'power2.out',
      })
      return
    }

    gsap.killTweensOf(pillEl)
    const tl = gsap.timeline()
    tl.to(
      pillEl,
      {
        x: left,
        y: top,
        width,
        height,
        opacity: 1,
        duration: 0.42,
        ease: 'power3.out',
      },
      0,
    )
    tl.to(
      pillEl,
      {
        filter: 'blur(4px)',
        duration: 0.18,
        ease: 'power1.inOut',
      },
      0,
    )
    tl.to(
      pillEl,
      {
        filter: 'blur(0px)',
        duration: 0.24,
        ease: 'power2.out',
      },
      0.18,
    )
  }, [])

  // Measure exact position of each section button relative to the nav container
  const getSectionTargetPct = useCallback((sectionId: string): number => {
    if (!sectionId) return 50
    const linkEl = linkRefs.current[sectionId]
    const navEl = nav.current
    if (!linkEl || !navEl) {
      switch (sectionId) {
        case 'about': return 16
        case 'work': return 39
        case 'experience': return 63
        case 'contact': return 85
        default: return 50
      }
    }
    const navRect = navEl.getBoundingClientRect()
    if (navRect.width === 0) return 50
    const linkRect = linkEl.getBoundingClientRect()
    const centerX = linkRect.left + linkRect.width / 2 - navRect.left
    return Math.max(12, Math.min(88, (centerX / navRect.width) * 100))
  }, [])

  const applyStyles = useCallback(() => {
    const el = nav.current
    if (!el) return
    const s = animState.current
    el.style.setProperty('--gradient-focus-x', `${s.focusX.toFixed(2)}%`)
    el.style.setProperty('--gradient-radius', `${s.radius.toFixed(1)}px`)
    el.style.setProperty('--focus-opacity', s.focusOpacity.toFixed(3))
    el.style.setProperty('--base-opacity', s.baseOpacity.toFixed(3))
    el.style.setProperty('--aura-opacity', s.auraOpacity.toFixed(3))
    el.style.setProperty('--transit-surge', s.transitSurge.toFixed(3))
  }, [])

  // Smooth transition to reduced-intensity default idle state
  const transitionToIdle = useCallback((duration = 1.0) => {
    gsap.killTweensOf(animState.current)
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      animState.current.focusX = 50
      animState.current.radius = 240
      animState.current.focusOpacity = 0
      animState.current.baseOpacity = 0.3
      animState.current.auraOpacity = 0.22
      animState.current.transitSurge = 1.0
      applyStyles()
      return
    }

    gsap.to(animState.current, {
      focusX: 50,
      radius: 240,
      focusOpacity: 0,
      baseOpacity: 0.3,
      auraOpacity: 0.22,
      transitSurge: 1.0,
      duration,
      ease: 'power2.inOut',
      onUpdate: applyStyles,
    })
  }, [applyStyles])

  // Smooth transition between buttons / sections with sudden gradual intensity increase in mid-flight returning to normal
  const animateGradientTransition = useCallback(
    (targetX: number, customDuration?: number) => {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (prefersReduced) {
        gsap.killTweensOf(animState.current)
        animState.current.focusX = targetX
        animState.current.radius = 50
        animState.current.focusOpacity = 1.0
        animState.current.baseOpacity = 0.08
        animState.current.auraOpacity = 0.85
        animState.current.transitSurge = 1.0
        applyStyles()
        return
      }

      const currentX = animState.current.focusX
      const distance = Math.abs(targetX - currentX)
      // Duration scales slightly with distance across the navbar
      const duration = customDuration ?? clamp(0.55 + (distance / 100) * 0.35, 0.58, 0.88)

      gsap.killTweensOf(animState.current)
      const tl = gsap.timeline()

      // 1. Move position smoothly across navbar from previous button to newer button
      tl.to(
        animState.current,
        {
          focusX: targetX,
          duration,
          ease: 'power2.inOut',
          onUpdate: applyStyles,
        },
        0,
      )

      // 2. Lock in focused active opacities
      tl.to(
        animState.current,
        {
          focusOpacity: 1.0,
          baseOpacity: 0.08,
          auraOpacity: 0.85,
          duration: Math.min(0.25, duration * 0.4),
          ease: 'power1.out',
        },
        0,
      )

      // 3. Radius breathes open slightly in mid-flight then condenses tightly (50px) at target
      tl.to(
        animState.current,
        {
          radius: Math.min(68, Math.max(50, animState.current.radius + 18)),
          duration: duration * 0.42,
          ease: 'sine.out',
        },
        0,
      )
      tl.to(
        animState.current,
        {
          radius: 50,
          duration: duration * 0.58,
          ease: 'sine.inOut',
        },
        duration * 0.42,
      )

      // 4. Sudden gradual intensity surge in mid-flight that returns smoothly to normal
      // "The intensity of the gradients while transiting should be normal, then a sudden gradual increase, and then goes to normal."
      tl.to(
        animState.current,
        {
          transitSurge: 1.9,
          duration: duration * 0.42,
          ease: 'power2.out',
        },
        0,
      )
      tl.to(
        animState.current,
        {
          transitSurge: 1.0,
          duration: duration * 0.58,
          ease: 'power2.inOut',
        },
        duration * 0.42,
      )
    },
    [applyStyles],
  )

  // When active section switches via scroll or navigation, smoothly glide the gradient focus to that button or transition to idle
  useEffect(() => {
    if (!isHoveringRef.current) {
      if (active && active !== 'top') {
        const targetX = getSectionTargetPct(active)
        animateGradientTransition(targetX)
      } else {
        transitionToIdle(1.0)
      }
    }
  }, [active, getSectionTargetPct, transitionToIdle, animateGradientTransition])

  useLayoutEffect(() => {
    updatePillPosition(true)
  }, [active, updatePillPosition])

  useEffect(() => {
    const handleResize = () => {
      updatePillPosition(false)
      if (!isHoveringRef.current) {
        if (activeRef.current && activeRef.current !== 'top') {
          const targetX = getSectionTargetPct(activeRef.current)
          animState.current.focusX = targetX
          animState.current.radius = 50
          animState.current.focusOpacity = 1.0
          animState.current.baseOpacity = 0.08
          animState.current.auraOpacity = 0.85
          animState.current.transitSurge = 1.0
          applyStyles()
        } else {
          transitionToIdle(0.3)
        }
      }
    }
    window.addEventListener('resize', handleResize)
    document.fonts?.ready.then(() => handleResize())
    return () => {
      window.removeEventListener('resize', handleResize)
      if (lockTimer.current !== undefined) {
        window.clearTimeout(lockTimer.current)
      }
      if (animFrame.current !== undefined) {
        cancelAnimationFrame(animFrame.current)
      }
    }
  }, [applyStyles, getSectionTargetPct, transitionToIdle, updatePillPosition])

  /* ───────── Scroll-spy: the section covering the most of the screen wins ───────── */
  useEffect(() => {
    const ids = ['top', ...links.map((l) => l.id)]
    let frame = 0

    const update = () => {
      frame = 0
      if (spyLocked.current) return // paused while a nav click is gliding

      const vh = window.innerHeight
      const atBottom = window.scrollY > 100 && vh + window.scrollY >= document.documentElement.scrollHeight - 4

      let best = ''
      if (atBottom) {
        best = 'contact' // short last section: reaching the bottom always means Contact
      } else {
        let bestVisible = 0
        for (const id of ids) {
          const el = document.getElementById(id)
          if (!el) continue
          const r = el.getBoundingClientRect()
          const visible = Math.min(r.bottom, vh) - Math.max(r.top, 0) // px of this section on screen
          if (visible > bestVisible) {
            bestVisible = visible
            best = id
          }
        }
      }
      setActive(best === 'top' ? '' : best)
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    const onScrollSpy = throttle(schedule, 100)

    syncSpy.current = update
    update()
    window.addEventListener('scroll', onScrollSpy, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', onScrollSpy)
      window.removeEventListener('resize', schedule)
      cancelAnimationFrame(frame)
    }
  }, [])

  // Cancel ongoing glide if user manually interacts with mouse wheel or touch
  useEffect(() => {
    const cancelGlide = () => {
      if (animFrame.current !== undefined) {
        cancelAnimationFrame(animFrame.current)
        animFrame.current = undefined
        applyVeil(0, 0)
        document.documentElement.removeAttribute('data-nav-gliding')
        window.dispatchEvent(new CustomEvent('nav-glide-end'))
        unlockSpy()
      }
    }

    window.addEventListener('wheel', cancelGlide, { passive: true })
    window.addEventListener('touchmove', cancelGlide, { passive: true })
    return () => {
      document.documentElement.removeAttribute('data-nav-gliding')
      window.dispatchEvent(new CustomEvent('nav-glide-end'))
      window.removeEventListener('wheel', cancelGlide)
      window.removeEventListener('touchmove', cancelGlide)
    }
  }, [applyVeil, unlockSpy])

  // Navigation click / event: glides smoothly while blurring page underneath with fixed veil
  const glideToSection = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (!el) return

    setActive(id)

    // Reduced motion: immediate jump with no blur
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (lenis) {
        lenis.scrollTo(el, { immediate: true })
      } else {
        el.scrollIntoView()
      }
      return
    }

    // Stop any existing transition
    if (animFrame.current !== undefined) {
      cancelAnimationFrame(animFrame.current)
      animFrame.current = undefined
    }

    // Set gliding state to freeze cursor interactivity until destination is reached and blur is removed
    document.documentElement.setAttribute('data-nav-gliding', 'true')
    window.dispatchEvent(new CustomEvent('nav-glide-start', { detail: { id } }))

    const currentY = window.scrollY
    const targetY = currentY + el.getBoundingClientRect().top
    const distance = Math.abs(targetY - currentY)
    const vh = window.innerHeight || 800
    const screenHops = distance / vh

    // Far jumps get a longer scroll and a stronger blur. Short hops get less.
    const duration = clamp(0.7 + screenHops * 0.20, MIN_DURATION, MAX_DURATION)
    const maxBlur = clamp(6 + screenHops * 3.5, 6, 18)

    lockSpy((duration + 0.25) * 1000)

    const startTime = performance.now()
    const startY = currentY

    const step = (now: number) => {
      const elapsed = (now - startTime) / 1000
      const progress = clamp(elapsed / duration, 0, 1)
      const easedProgress = easeInOutCubic(progress)
      const nextY = startY + (targetY - startY) * easedProgress

      if (lenis) {
        lenis.scrollTo(nextY, { immediate: true })
      } else {
        window.scrollTo(0, nextY)
      }

      // The blur fades in quickly (~0.35s) and fades out when the scroll lands.
      const fadeIn = clamp(elapsed / 0.35, 0, 1)
      const fadeOut = clamp((duration - elapsed) / 0.35, 0, 1)
      const veilProgress = easeInOutCubic(Math.min(fadeIn, fadeOut))
      applyVeil(veilProgress, maxBlur)

      if (progress < 1) {
        animFrame.current = requestAnimationFrame(step)
      } else {
        animFrame.current = undefined
        applyVeil(0, 0)
        document.documentElement.removeAttribute('data-nav-gliding')
        window.dispatchEvent(new CustomEvent('nav-glide-end', { detail: { id } }))
        if (lenis) {
          lenis.scrollTo(targetY, { immediate: true })
        } else {
          window.scrollTo(0, targetY)
        }
        setTimeout(unlockSpy, 50)
      }
    }

    animFrame.current = requestAnimationFrame(step)
  }, [lenis, lockSpy, unlockSpy, applyVeil])

  useEffect(() => {
    const onNavGlide = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail
      if (detail?.id) {
        glideToSection(detail.id)
      }
    }
    window.addEventListener('nav-glide', onNavGlide)
    return () => {
      window.removeEventListener('nav-glide', onNavGlide)
    }
  }, [glideToSection])

  const handleBackToTop = (e: React.MouseEvent) => {
    e.preventDefault()
    glideToSection('top')
  }

  const go = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    glideToSection(id)
  }

  const handleButtonEnter = (id: string) => {
    isHoveringRef.current = true
    if (hoveredButtonRef.current === id) return
    hoveredButtonRef.current = id
    const targetX = getSectionTargetPct(id)
    animateGradientTransition(targetX)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const navEl = nav.current
    if (!navEl) return
    isHoveringRef.current = true

    // Find the button closest to mouse X to smoothly transition between buttons
    const mouseX = e.clientX
    let closestId = ''
    let closestDist = Infinity

    for (const l of links) {
      const el = linkRefs.current[l.id]
      if (!el) continue
      const r = el.getBoundingClientRect()
      const centerX = r.left + r.width / 2
      const dist = Math.abs(mouseX - centerX)
      if (dist < closestDist) {
        closestDist = dist
        closestId = l.id
      }
    }

    if (closestId && closestId !== hoveredButtonRef.current) {
      hoveredButtonRef.current = closestId
      const targetX = getSectionTargetPct(closestId)
      animateGradientTransition(targetX)
    }
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    isHoveringRef.current = true
    handleMouseMove(e)
  }

  const handleMouseLeave = () => {
    isHoveringRef.current = false
    hoveredButtonRef.current = null
    // Smoothly glide back to the current active section button or transition to reduced-intensity idle
    if (activeRef.current && activeRef.current !== 'top') {
      const targetX = getSectionTargetPct(activeRef.current)
      animateGradientTransition(targetX)
    } else {
      transitionToIdle(1.0)
    }
  }

  return (
    <>
      {/* Fixed backdrop veil layer that blurs the entire screen underneath while gliding */}
      <div
        ref={veil}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-40 will-change-[backdrop-filter,background-color] transition-none"
        style={{
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
          backgroundColor: 'transparent',
          opacity: 0,
        }}
      />

      {/* MOBILE Back-to-top button (viewport < 768px): fixed at bottom center, sibling of header */}
      {isMobile && (
        <div
          aria-hidden={!mobileShowTop}
          className={`pointer-events-none fixed inset-x-0 z-40 flex justify-center transition-opacity duration-300 ${isHidden ? 'opacity-0' : 'opacity-100'}`}
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}
        >
          <button
            ref={mobileBtn}
            type="button"
            onClick={() => glideToSection('top')}
            aria-label="Back to top"
            title="Back to top"
            tabIndex={mobileShowTop ? 0 : -1}
            className={`relative grid size-12 place-items-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-xl shadow-[0_8px_28px_rgba(0,0,0,0.45),inset_0_1px_0_rgb(255_255_255/0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${mobileShowTop ? 'pointer-events-auto' : 'pointer-events-none'}`}
          >
            {/* ripple ring that pulses once when the button lands */}
            <span
              ref={mobileRipple}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-full border border-white/40 opacity-0"
            />
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 19V5" />
              <path d="M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>
      )}

      <header
        className={`fixed inset-x-0 top-4 z-50 px-4 md:px-8 lg:px-12 pt-[env(safe-area-inset-top)] pointer-events-none transition-all duration-300 ${
          isHidden ? 'opacity-0 -translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'
        }`}
      >
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center md:grid-cols-[1fr_auto_1fr]">
          {/* LEFT: theme */}
          <div className="hidden md:flex justify-start">
            <ThemeToggle className="hdr-btn" />
          </div>

          {/* CENTRE: the nav pill */}
          <div className="justify-self-center">
            <div ref={entrance} className="relative">
              {/* DESKTOP: Back to Home button */}
              {!isMobile && (
                <div
                  ref={btnWrapperRef}
                  className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none z-20"
                >
                  <button
                    ref={buttonRef}
                    type="button"
                    data-magnetic
                    tabIndex={-1}
                    aria-hidden="true"
                    aria-label="Back to top"
                    title="Back to top"
                    onClick={handleBackToTop}
                    className="group/top-btn top-btn pointer-events-auto relative flex items-center justify-center rounded-full bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 w-[36px] h-[36px] sm:w-[44px] sm:h-[44px]"
                  >
                    <span aria-hidden="true" className="top-btn-ring" />
                    <span aria-hidden="true" className="top-btn-halo" />
                    <svg
                      ref={arrowIconRef}
                      className="w-[18px] h-[18px] text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path className="top-arrow-path" d="M12 19V5M5 12l7-7 7 7" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Gemini Rainbow Glow & Reactive Gradient Border container */}
              <div
                ref={nav}
                style={
                  {
                    '--gradient-focus-x': '50%',
                    '--gradient-radius': '240px',
                    '--focus-opacity': '0',
                    '--base-opacity': '0.3',
                    '--aura-opacity': '0.22',
                    '--transit-surge': '1',
                  } as React.CSSProperties
                }
                className="relative group/nav pointer-events-auto select-none"
                onMouseMove={handleMouseMove}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                {/* Layer 1: Atmospheric living aura wrapping around the nav with Gemini signature multi-color rainbow gradient */}
                <div aria-hidden="true" className="gemini-aura-ambient">
                  <div className="gemini-conic-stream" />
                </div>

                {/* Layer 2: Shimmer neon halo around the perimeter border */}
                <div aria-hidden="true" className="gemini-aura-shimmer">
                  <div className="gemini-conic-stream" />
                </div>

                <div ref={shapeRef} aria-hidden="true" className="nav-shape" style={{ ['--nav-reach' as string]: `${NAV_REACH}px` }}>
                  <div className="nav-shape-layer nav-shape-drop"><div className="nav-shape-fill" data-clip="outer" /></div>
                  <div className="nav-shape-layer nav-shape-halo"><div className="nav-shape-fill" data-clip="ring" /></div>
                  <div className="nav-shape-layer nav-shape-surface" data-clip="inner" />
                  <div className="nav-shape-layer nav-shape-ring" data-clip="ring">
                    <div className="gemini-conic-stream gemini-conic-base" />
                    <div className="nav-shape-navarea">
                      <div className="gemini-conic-focus"><div className="gemini-conic-stream" /></div>
                      <div className="gemini-hover-spotlight" />
                    </div>
                  </div>
                </div>

                <div ref={bodyRef} className="relative p-[1.5px]">
                  <nav
                    aria-label="Primary"
                    className="relative flex items-center gap-1 p-1.5 text-sm rounded-full overflow-hidden border border-transparent"
                  >
                    {/* Dynamic active/hover glow inside the glass beneath active section button */}
                    <div aria-hidden="true" className="gemini-active-glow" />

                    <ul ref={ulRef} className="relative flex items-center gap-0.5 sm:gap-1">
                      {/* Shared sliding and blurring glass pill indicator */}
                      <span
                        ref={pill}
                        aria-hidden="true"
                        className="absolute top-0 left-0 rounded-full bg-white/15 border border-white/20 shadow-[inset_0_1px_0_rgb(255_255_255/0.3)] pointer-events-none opacity-0 will-change-transform"
                      />

                      {links.map((l) => (
                        <li key={l.id}>
                          <a
                            ref={(el) => {
                              linkRefs.current[l.id] = el
                            }}
                            href={`#${l.id}`}
                            onClick={(e) => go(e, l.id)}
                            onMouseEnter={() => handleButtonEnter(l.id)}
                            aria-current={active === l.id ? 'true' : undefined}
                            className={`relative z-10 block rounded-full px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition-colors duration-200 ${
                              active === l.id
                                ? 'text-white'
                                : 'text-mist hover:text-white'
                            }`}
                          >
                            {l.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: get in touch */}
                    {/* RIGHT: share (desktop: copies the link · phone/tablet: opens the share menu) */}
          <div className="hidden md:flex justify-end">
            <ShareButton className="hdr-btn pointer-events-auto" />
          </div>
        </div>
      </header>
    </>
  )
}
