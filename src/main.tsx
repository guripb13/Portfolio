import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import 'lenis/dist/lenis.css'
import './index.css'
import App from './App'
import Loader from './components/Loader'

function Root() {
  const [isAppLoaded, setIsAppLoaded] = useState(false)
  const [showLoader, setShowLoader] = useState(true)

  return (
    <>
      <App isAppLoaded={isAppLoaded} />
      {showLoader && (
        <Loader
          onReady={() => setIsAppLoaded(true)}
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
