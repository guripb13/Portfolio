import { useEffect, useRef, useState } from 'react'
import { ReactLenis, useLenis, type LenisRef } from 'lenis/react'
import { gsap, ScrollTrigger } from './lib/gsap'
import { useReducedMotion } from './lib/useMedia'
import CustomCursor from './components/CustomCursor'
import AmbientGlow from './components/AmbientGlow'
import SectionBackdrop from './components/SectionBackdrop'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import About from './components/About'
import Projects from './components/Projects'
import ProjectViewer from './components/ProjectViewer'
import Timeline from './components/Timeline'
import Contact from './components/Contact'

/** Keeps ScrollTrigger in sync with Lenis' smoothed scroll position. */
function ScrollSync() {
  useLenis(() => ScrollTrigger.update())
  return null
}

export default function App({ isAppLoaded = false }: { isAppLoaded?: boolean }) {
  const lenisRef = useRef<LenisRef>(null)
  const reduced = useReducedMotion()
  const [activeProject, setActiveProject] = useState<number | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [pageHidden, setPageHidden] = useState(false)

  useEffect(() => {
    // Lenis must be driven by GSAP's ticker, otherwise pinned sections desync.
    const raf = (time: number) => lenisRef.current?.lenis?.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    // Recalculate trigger positions once web fonts have changed text metrics
    document.fonts?.ready.then(() => ScrollTrigger.refresh())
    return () => gsap.ticker.remove(raf)
  }, [])

  const handleOpenProject = (index: number) => {
    setActiveProject(index)
    setViewerOpen(true)
    lenisRef.current?.lenis?.stop()
    // Hide page behind the viewer once open to keep animations lightweight
    setTimeout(() => {
      setPageHidden(true)
    }, 700)
  }

  const handleCloseViewer = () => {
    setPageHidden(false)
    setViewerOpen(false)
    lenisRef.current?.lenis?.start()
    setTimeout(() => {
      setActiveProject(null)
      ScrollTrigger.refresh()
    }, 700)
  }

  const handleContactFromViewer = () => {
    setPageHidden(false)
    setViewerOpen(false)
    lenisRef.current?.lenis?.start()
    setTimeout(() => {
      setActiveProject(null)
      const el = document.getElementById('contact')
      if (el) {
        if (lenisRef.current?.lenis) {
          lenisRef.current.lenis.scrollTo(el, { duration: 1.2 })
        } else {
          el.scrollIntoView({ behavior: 'smooth' })
        }
      }
      ScrollTrigger.refresh()
    }, 400)
  }

  return (
    <ReactLenis root ref={lenisRef} options={{ autoRaf: false, lerp: reduced ? 1 : 0.1, smoothWheel: !reduced }}>
      <ScrollSync />
      <a href="#about" className="skip-link">Skip to content</a>
      <div className="ambient" aria-hidden="true" />
      <AmbientGlow />
      <SectionBackdrop suspended={viewerOpen} />
      <CustomCursor />

      {/* Top Fixed Sticky Navbar */}
      <Navbar isHidden={viewerOpen || !isAppLoaded} />

      {/* Main page wrapper that slides left when viewer opens */}
      <div
        className={`w-full min-h-screen transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          viewerOpen ? '-translate-x-[25%] pointer-events-none' : ''
        }`}
        style={pageHidden ? { visibility: 'hidden' } : undefined}
      >
        <main>
          <Hero isAppLoaded={isAppLoaded} />
          <About />
          <Projects onOpenProject={handleOpenProject} />
          <Timeline />
          <Contact />
        </main>
      </div>

      {/* Horizontal Project Viewer */}
      <ProjectViewer
        initialIndex={activeProject}
        isOpen={viewerOpen}
        onClose={handleCloseViewer}
        onContact={handleContactFromViewer}
      />
    </ReactLenis>
  )
}
