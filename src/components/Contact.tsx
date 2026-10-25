import { resume } from '../data/resume'
import GlassCard from './GlassCard'

export default function Contact() {
  return (
    <section
      id="contact"
      className="relative flex min-h-svh scroll-mt-[-6rem] flex-col justify-center px-6 pb-[clamp(0.75rem,2svh,1.5rem)] pt-[clamp(4.5rem,9svh,6rem)] md:px-12 lg:mx-auto lg:w-full lg:max-w-7xl lg:px-24 lg:pb-[clamp(1rem,2.55svh,2.5rem)] [--nav-gap:8rem] lg:pt-[var(--nav-gap)]"
    >
      <GlassCard
        className="mx-auto w-full max-w-5xl px-6 py-[clamp(1.5rem,6svh,6rem)] text-center md:px-[clamp(2rem,5vw,4rem)] lg:py-[clamp(2rem,7.65svh,8rem)]"
        data-cursor
      >
        <h2 className="text-gradient mx-auto max-w-[16ch] text-[clamp(1.75rem,min(6.5vw,9svh),5.5rem)] lg:text-[clamp(2.5rem,min(6.5vw,11.05svh),8rem)]">Let's build something together</h2>
        <p className="mx-auto mt-[clamp(0.75rem,2.5svh,1.5rem)] max-w-[46ch] text-[clamp(0.9rem,2.4svh,1.125rem)] text-mist lg:mt-[clamp(1rem,2.98svh,2.5rem)] lg:text-[clamp(1rem,2.55svh,1.6rem)]">I'm open to freelance projects and full-time roles. Tell me what you're making and I'll reply within two working days.</p>
        <a href={`mailto:${resume.email}`} data-magnetic className="btn mt-[clamp(1rem,4svh,2.5rem)] max-w-full !px-6 !py-[clamp(0.6rem,1.8svh,1rem)] text-center text-[clamp(0.875rem,2.2svh,1.125rem)] [overflow-wrap:anywhere] sm:!px-8 lg:mt-[clamp(1.25rem,4.67svh,3.5rem)] lg:!py-[clamp(0.75rem,2.04svh,1.5rem)] lg:text-[clamp(1rem,2.38svh,1.5rem)]">Email {resume.email}</a>
        <ul className="mt-[clamp(1rem,4svh,2.5rem)] flex flex-wrap justify-center gap-3 lg:mt-[clamp(1.25rem,4.67svh,3.5rem)]">
          {resume.socials.map((s) => (
            <li key={s.label}><a href={s.href} target="_blank" rel="noreferrer noopener" data-magnetic className="btn btn-ghost !px-5 !py-[clamp(0.4rem,1.3svh,0.625rem)] text-sm lg:!px-7 lg:!py-[clamp(0.5rem,1.53svh,1rem)] lg:text-[clamp(0.875rem,1.87svh,1.2rem)]">{s.label}</a></li>
          ))}
        </ul>
      </GlassCard>
      <footer className="mx-auto mt-[clamp(0.75rem,2.5svh,2.5rem)] w-full max-w-5xl text-center text-sm text-mist lg:mt-[clamp(1rem,2.55svh,2.5rem)]">Designed & built by <strong className="font-bold">Guriqbal Singh</strong></footer>
    </section>
  )
}