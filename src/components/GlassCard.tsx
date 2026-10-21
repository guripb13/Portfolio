import { useRef, type HTMLAttributes } from 'react'
import { gsap } from '../lib/gsap'

interface Props extends HTMLAttributes<HTMLDivElement> {
  /** Adds a gentle 3D tilt that follows the pointer. */
  tilt?: boolean
}

/**
 * Advanced glass surface. The pointer-following sheen (CSS ::before) reads --gx / --gy,
 * which this component updates on pointermove.
 */
export default function GlassCard({ tilt = false, className = '', children, onPointerMove, onPointerLeave, ...rest }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (el) {
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width
      const y = (e.clientY - r.top) / r.height
      el.style.setProperty('--gx', `${x * 100}%`)
      el.style.setProperty('--gy', `${y * 100}%`)
      if (tilt && e.pointerType === 'mouse' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.to(el, { rotationY: (x - 0.5) * 14, rotationX: -(y - 0.5) * 14, transformPerspective: 900, duration: 0.5, ease: 'power3.out', overwrite: 'auto' })
      }
    }
    onPointerMove?.(e)
  }
  const leave = (e: React.PointerEvent<HTMLDivElement>) => {
    if (tilt && ref.current) gsap.to(ref.current, { rotationX: 0, rotationY: 0, duration: 0.9, ease: 'elastic.out(1,0.5)', overwrite: 'auto' })
    onPointerLeave?.(e)
  }

  return (
    <div ref={ref} className={`glass ${className}`} onPointerMove={move} onPointerLeave={leave} {...rest}>
      {children}
    </div>
  )
}
