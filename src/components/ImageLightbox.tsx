import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from '../lib/gsap'

export interface ZoomState {
  idx: number            // which project panel it came from
  el: HTMLElement        // the thumbnail card (its position is the start/end point)
  low: string            // low-quality src
  full: string           // high-quality src
  alt: string
  ratio: number          // natural width / height of the image
}

interface Props {
  zoom: ZoomState
  onClosed: () => void   // called AFTER the return animation finishes
}

const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function ImageLightbox({ zoom, onClosed }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const closingRef = useRef(false)
  const [fullLoaded, setFullLoaded] = useState(false)

  // Final centred size: fit inside 92vw x 88vh, keep aspect ratio
  const target = () => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const w = Math.min(vw * 0.92, vh * 0.88 * zoom.ratio)
    const h = w / zoom.ratio
    return { left: (vw - w) / 2, top: (vh - h) / 2, width: w, height: h }
  }

  const startRect = () => {
    const r = zoom.el.getBoundingClientRect()
    return { left: r.left, top: r.top, width: r.width, height: r.height }
  }

  // Open: thumbnail position -> centre
  useLayoutEffect(() => {
    const wrap = wrapRef.current
    const backdrop = backdropRef.current
    if (!wrap || !backdrop) return
    const d = reduce() ? 0 : 0.6
    gsap.set(wrap, { ...startRect(), borderRadius: 24 })
    gsap.to(wrap, { ...target(), borderRadius: 16, duration: d, ease: 'power3.inOut' })
    gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: d * 0.8, ease: 'power2.out' })
    return () => { gsap.killTweensOf([wrap, backdrop]) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load the high-quality image in the background
  useEffect(() => {
    const img = new Image()
    img.src = zoom.full
    img.onload = () => setFullLoaded(true)
    if (img.complete) setFullLoaded(true)
  }, [zoom.full])

  // Close: centre -> thumbnail position, back to low quality
  const close = () => {
    if (closingRef.current) return
    closingRef.current = true
    setFullLoaded(false) // show the low-quality image again while returning
    const wrap = wrapRef.current
    const backdrop = backdropRef.current
    if (!wrap || !backdrop) return onClosed()
    const d = reduce() ? 0 : 0.5
    gsap.to(backdrop, { opacity: 0, duration: d, ease: 'power2.in' })
    gsap.to(wrap, {
      ...startRect(),
      borderRadius: 24,
      duration: d,
      ease: 'power3.inOut',
      onComplete: onClosed,
    })
  }

  // Esc closes only the image (capture phase so the viewer never sees it)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        close()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep it centred if the window is resized or rotated while open
  useEffect(() => {
    const onResize = () => {
      if (!closingRef.current && wrapRef.current) gsap.set(wrapRef.current, target())
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-30" role="dialog" aria-modal="true" aria-label={`${zoom.alt} enlarged`}>
      {/* Click anywhere outside the image -> close */}
      <div
        ref={backdropRef}
        data-cursor
        onClick={close}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-zoom-out"
      />
      {/* The image box (animated by GSAP) */}
      <div
        ref={wrapRef}
        data-cursor
        onClick={close}
        className="fixed overflow-hidden border border-white/20 shadow-2xl cursor-zoom-out"
        style={{ willChange: 'left, top, width, height' }}
      >
        {/* Low quality: shown instantly */}
        <img src={zoom.low} alt={zoom.alt} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        {/* High quality: fades in on top when loaded */}
        <img
          src={zoom.full}
          alt=""
          aria-hidden="true"
          decoding="async"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
          style={{ opacity: fullLoaded ? 1 : 0 }}
        />
      </div>
    </div>
  )
}
