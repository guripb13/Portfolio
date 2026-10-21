import { resume } from '../data/resume'
import GlassCard from './GlassCard'

export default function Contact() {
  return (
    <section id="contact" className="relative px-6 pb-12 pt-20 md:px-12 md:pt-32">
      <GlassCard className="mx-auto max-w-5xl px-6 py-16 text-center md:px-16 md:py-24" data-cursor>
        <h2 className="text-gradient mx-auto max-w-[16ch] text-[clamp(2.5rem,6.5vw,5.5rem)]">Let's build something together</h2>
        <p className="mx-auto mt-6 max-w-[46ch] text-lg text-mist">I'm open to freelance projects and full-time roles. Tell me what you're making and I'll reply within two working days.</p>
        <a href={`mailto:${resume.email}`} data-magnetic className="btn mt-10 max-w-full !px-6 !py-4 text-center text-base [overflow-wrap:anywhere] sm:!px-8 sm:text-lg">Email {resume.email}</a>
        <ul className="mt-10 flex flex-wrap justify-center gap-3">
          {resume.socials.map((s) => (
            <li key={s.label}><a href={s.href} target="_blank" rel="noreferrer noopener" data-magnetic className="btn btn-ghost !px-5 !py-2.5 text-sm">{s.label}</a></li>
          ))}
        </ul>
      </GlassCard>
      <footer className="mx-auto mt-10 max-w-5xl text-center text-sm text-mist">© {new Date().getFullYear()} {resume.name}. Built with React, Three.js and GSAP.</footer>
    </section>
  )
}
