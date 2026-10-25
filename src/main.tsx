import { StrictMode, Suspense, lazy, useState } from 'react'
import { createRoot } from 'react-dom/client'
import 'lenis/dist/lenis.css'
import './index.css'
import Loader from './components/Loader'
import { resume } from './data/resume'
import { prefetchLater, startSiteLoad } from './lib/siteLoad'

/*
 * LOADING FLOW
 * 1. index.html paints an instant HTML/CSS loader shell (no JS needed).
 * 2. This tiny entry file (React + Loader only) mounts the real Loader.
 * 3. At the same moment, the whole website is downloaded IN PARALLEL as a separate chunk,
 *    together with photos, fonts and layout. Their real progress drives the Loader ring.
 * 4. When everything is ready the ring reaches 100%, the exit animation plays, the site opens.
 */

/* Nothing on the page can be dragged out (links, buttons, images): no link / image "ghost" while holding and dragging */
document.addEventListener('dragstart', (e) => {
  const t = e.target as Element | null
  if (t && t.closest && t.closest('a, button, [role="button"], img')) e.preventDefault()
})

const appPromise = startSiteLoad(() => import('./App'), resume.photo)
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
          onReady={() => { setIsAppLoaded(true); prefetchLater(resume.aboutPhoto) }}
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