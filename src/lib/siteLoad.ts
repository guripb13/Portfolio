/**
 * Real, measured loading progress for the whole website.
 * Everything here is a REAL signal (bytes streamed, chunks resolved, fonts ready, layout mounted).
 * The Loader ring simply reads getProgress() every frame, so 30% loaded = 30% ring.
 */

type TaskName = 'app' | 'photo' | 'fonts' | 'images' | 'window' | 'layout'

/** Weights add up to the whole website. Bigger weight = bigger slice of the ring. */
const WEIGHTS: Record<TaskName, number> = {
  app: 34,     // the website's code chunk (all sections)
  photo: 20,   // hero photo (streamed byte by byte)
  fonts: 10,   // web fonts
  images: 6,   // any other <img> on the page
  window: 6,   // window 'load' event
  layout: 24,  // layout mounted + first paint committed
}

const frac: Record<TaskName, number> = {
  app: 0, photo: 0, fonts: 0, images: 0, window: 0, layout: 0,
}

const TOTAL = Object.values(WEIGHTS).reduce((a, b) => a + b, 0)
const ASSET_TIMEOUT_MS = 8000 // one slow file never blocks the site forever

export const setTask = (name: TaskName, v: number) => {
  const n = Math.min(Math.max(v, 0), 1)
  if (n > frac[name]) frac[name] = n // never goes backwards
}

/** 0..1 — the true share of the website that has loaded. */
export const getProgress = () => {
  let s = 0
  for (const k in WEIGHTS) s += WEIGHTS[k as TaskName] * frac[k as TaskName]
  return s / TOTAL
}

/** Stream a file and report real bytes received. Falls back to an <img> load if streaming isn't possible. */
function trackAsset(name: TaskName, src: string) {
  let done = false
  const finish = () => {
    if (done) return
    done = true
    setTask(name, 1)
  }
  window.setTimeout(finish, ASSET_TIMEOUT_MS)

  const fallback = () => {
    const img = new Image()
    img.onload = finish
    img.onerror = finish
    img.src = src
  }

  fetch(src)
    .then(async (res) => {
      const total = Number(res.headers.get('content-length')) || 0
      if (!res.body || !total) {
        await res.blob()
        finish()
        return
      }
      const reader = res.body.getReader()
      let got = 0
      for (;;) {
        const { done: d, value } = await reader.read()
        if (d) break
        got += value.byteLength
        if (!done) setTask(name, Math.min(got / total, 0.98))
      }
      finish()
    })
    .catch(fallback)
}

let started = false

/**
 * Starts everything at once, in parallel, the moment the entry file runs.
 * `loadApp` is the dynamic import of the website; it resolves when the code chunk has arrived.
 */
export function startSiteLoad<T>(loadApp: () => Promise<T>, photo: string): Promise<T> {
  if (started) return loadApp()
  started = true

  // 1. website code
  const appP = loadApp()
  appP.then(() => setTask('app', 1), () => setTask('app', 1))

  // 2. hero photo (real byte progress). Below-the-fold photos are NOT awaited, see prefetchLater()
  trackAsset('photo', photo)

  // 3. fonts
  const fontsP = Promise.race([
    document.fonts?.load('700 1em "Bricolage Grotesque"') ?? Promise.resolve(),
    new Promise((res) => window.setTimeout(res, 4000)),
  ])
  fontsP.catch(() => undefined).finally(() => setTask('fonts', 1))

  // 4. window load
  if (document.readyState === 'complete') setTask('window', 1)
  else window.addEventListener('load', () => setTask('window', 1), { once: true })

  // 5. every other <img> currently on the page
  const seen = new Map<HTMLImageElement, { done: boolean; t0: number }>()
  const scan = () => {
    const now = performance.now()
    Array.from(document.images).forEach((img) => {
      if (img.loading === 'lazy' || !(img.currentSrc || img.src)) return
      let rec = seen.get(img)
      if (!rec) {
        rec = { done: img.complete, t0: now }
        seen.set(img, rec)
        if (!rec.done) {
          const mark = () => { const r = seen.get(img); if (r) r.done = true }
          img.addEventListener('load', mark, { once: true })
          img.addEventListener('error', mark, { once: true })
        }
      }
      if (!rec.done && now - rec.t0 > ASSET_TIMEOUT_MS) rec.done = true
    })
    let d = 0
    seen.forEach((r) => { if (r.done) d++ })
    setTask('images', seen.size ? d / seen.size : 0)
  }
  const t0 = performance.now()
  const timer = window.setInterval(() => {
    scan()
    // stop when the layout is in, or after the asset timeout so the poll can never run forever
    if (frac.layout >= 1 || performance.now() - t0 > ASSET_TIMEOUT_MS * 2) {
      // final sweep, then stop polling
      setTask('images', 1)
      window.clearInterval(timer)
    }
  }, 150)

  return appP
}

/** Called by the website once its layout is mounted and the first frame is painted. */
export function markLayoutReady() {
  // two frames = React committed + browser painted
  requestAnimationFrame(() => requestAnimationFrame(() => setTask('layout', 1)))
}

/** Warm the cache for below-the-fold images once the site is already on screen (never blocks the loader). */
export function prefetchLater(...srcs: string[]) {
  const run = () => srcs.forEach((src) => { const i = new Image(); i.decoding = 'async'; i.src = src })
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }
  if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 2500 })
  else window.setTimeout(run, 800)
}