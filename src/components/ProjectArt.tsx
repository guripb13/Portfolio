import type { Project } from '../data/resume'

// The same top-left glow recipe as everywhere else on the site (eased stops = smooth, no banding)
const GLOW = 'radial-gradient(circle 20rem at 0% 0%, rgb(61 139 255 / .68) 0%, rgb(61 139 255 / .50) 12%, rgb(61 139 255 / .32) 26%, rgb(61 139 255 / .16) 42%, rgb(61 139 255 / .05) 60%, transparent 76%)'

/** Project cover: the screenshot if there is one, otherwise a dark panel with the top-left glow. Fills its (relative) parent. */
export default function ProjectArt({ p }: { p: Project }) {
  if (p.image) return <img src={p.image} alt={`${p.title} preview`} className="absolute inset-0 h-full w-full object-cover" />
  return (
    <div className="absolute inset-0 bg-[#0a0d1f]" aria-hidden="true">
      <div className="absolute inset-0 transition-opacity duration-500 group-hover:opacity-0" style={{ background: GLOW }} />
      <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'linear-gradient(rgb(255 255 255/.15) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255/.15) 1px, transparent 1px)', backgroundSize: '44px 44px', maskImage: 'radial-gradient(circle 16rem at 0% 0%, #000, transparent 100%)', WebkitMaskImage: 'radial-gradient(circle 16rem at 0% 0%, #000, transparent 100%)' }} />
      <span className="absolute -bottom-10 right-6 select-none font-display text-[clamp(8rem,20vw,16rem)] font-bold leading-none text-white/[0.06]">{p.title[0]}</span>
    </div>
  )
}
