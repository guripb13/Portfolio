import { StrictMode, Suspense, lazy, useState } from 'react'
import { createRoot } from 'react-dom/client'
import 'lenis/dist/lenis.css'
import './index.css'
import Loader from './components/Loader'
import { resume } from './data/resume'
import { startSiteLoad } from './lib/siteLoad'

/*
 * LOADING FLOW
 * 1. index.html paints an instant HTML/CSS loader shell (no JS needed).
 * 2. This tiny entry file (React + Loader only) mounts the real Loader.
 * 3. At the same moment, the whole website is downloaded IN PARALLEL as a separate chunk,
 *    together with photos, fonts and layout. Their real progress drives the Loader ring.
 * 4. A final quality check re-verifies every required file. Only after it passes does the ring reach 100%,
 *    the exit animation play and the site open.
 */

/* Nothing on the page can be dragged out (links, buttons, images): no link / image "ghost" while holding and dragging */
document.addEventListener('dragstart', (e) => {
  const t = e.target as Element | null
  if (t && t.closest && t.closest('a, button, [role="button"], img')) e.preventDefault()
})

/* Every image that must be fully downloaded and verified before the ring may reach 100% */
const REQUIRED_ASSETS = [
  resume.photo,
  resume.aboutPhoto,
  ...resume.projects.map((p) => p.image ?? ''),
]

const appPromise = startSiteLoad(() => import('./App'), REQUIRED_ASSETS)
const App = lazy(() => appPromise)

function Root() {
  const [isAppLoaded, setIsAppLoaded] = useState(false)
  const [showLoader, setShowLoader] = useState(true)

  return (
    <>
      <Suspense fallback={null}>
        <App isAppLoaded={isAppLoaded} />
      </Suspense>
      {showLoader && (
        <Loader
          onReady={() => { setIsAppLoaded(true) }}
          onExited={() => setShowLoader(false)}
        />
      )}
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
