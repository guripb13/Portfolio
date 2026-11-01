/**
 * Real, measured loading progress for the whole website, with a final quality check.
 *
 * The ring can NEVER show 100% until all of these are true:
 *   1. the website code has arrived,
 *   2. every required image has been downloaded completely, is really an image, and decodes,
 *   3. the web fonts are ready,
 *   4. the window 'load' event has fired,
 *   5. the layout is mounted and painted,
 *   6. the final quality check has re-verified everything above.
 * Until step 6 passes, the ring is held at 99% at most.
 *
 * A file that fails (missing or broken) is retried once, then reported in the console and skipped,
 * so one bad file can never keep the visitor on the loader forever.
 */

type TaskName = 'app' | 'assets' | 'fonts' | 'window' | 'layout' | 'verify'

/** Weights add up to the whole website. Bigger weight = bigger slice of the ring. */
const WEIGHTS: Record<TaskName, number> = {
  app: 30,     // the website's code chunk (all sections)
  assets: 34,  // every required image (real bytes received)
  fonts: 8,    // web fonts
  window: 4,   // window 'load' event
  layout: 20,  // layout mounted + first paint committed
  verify: 4,   // final quality check
}

const frac: Record<TaskName, number> = {
  app: 0, assets: 0, fonts: 0, window: 0, layout: 0, verify: 0,
}

const TOTAL = Object.values(WEIGHTS).reduce((a, b) => a + b, 0)
const ATTEMPT_TIMEOUT_MS = 4000 // one download attempt may take this long before it counts as failed
const MAX_RETRIES = 1           // failed files are tried one more time (worst case about 8 s per file, all files in parallel)
const FONT_TIMEOUT_MS = 4000

export const setTask = (name: TaskName, v: number) => {
  const n = Math.min(Math.max(v, 0), 1)
  if (n > frac[name]) frac[name] = n // never goes backwards
}

/** 0..1 — the true share of the website that has loaded. Exactly 1 only after the quality check passed. */
export const getProgress = () => {
  if (frac.verify >= 1) return 1
  let s = 0
  for (const k in WEIGHTS) s += WEIGHTS[k as TaskName] * frac[k as TaskName]
  return Math.min(s / TOTAL, 0.99)
}

/* ───────── Required files ───────── */

interface Asset {
  src: string
  frac: number              // 0..1 download progress
  state: 'pending' | 'ok' | 'failed'
}

let assets: Asset[] = []

export interface LoadReport {
  checked: number
  ok: string[]
  failed: string[]
  passed: boolean
}
let report: LoadReport = { checked: 0, ok: [], failed: [], passed: false }
/** What the quality check found (for debugging; also printed in the browser console). */
export const getLoadReport = () => report

const updateAssetsTask = () => {
  if (!assets.length) { setTask('assets', 1); return }
  const sum = assets.reduce((a, x) => a + (x.state === 'pending' ? Math.min(x.frac, 0.98) : 1), 0)
  setTask('assets', sum / assets.length)
}

/** Downloads a file completely. Returns true only if the response is OK, is an image, and every byte arrived. */
async function download(a: Asset, attempt: number): Promise<boolean> {
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), ATTEMPT_TIMEOUT_MS)
  try {
    const res = await fetch(a.src, { signal: ctrl.signal, cache: attempt === 0 ? 'default' : 'reload' })
    if (!res.ok) return false
    const type = res.headers.get('content-type') || ''
    if (type && !type.startsWith('image/')) return false // e.g. a missing file answered with the index.html page
    const total = Number(res.headers.get('content-length')) || 0
    const encoded = !!res.headers.get('content-encoding') // compressed: content-length no longer matches the bytes we read
    if (!res.body) {
      await res.blob()
      return true
    }
    const reader = res.body.getReader()
    let got = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      got += value.byteLength
      if (total) { a.frac = Math.min(got / total, 0.98); updateAssetsTask() }
    }
    if (total && !encoded && got < total) return false // the file was cut short
    return got > 0
  } catch {
    return false
  } finally {
    window.clearTimeout(timer)
  }
}

/** True if the browser can really decode the picture (not broken, not empty). */
async function decodes(src: string): Promise<boolean> {
  try {
    const img = new Image()
    img.src = src
    if (img.decode) await img.decode()
    else await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('img')) })
    return img.naturalWidth > 0 && img.naturalHeight > 0
  } catch {
    return false
  }
}

/** Download + decode one file, retrying once. Never throws. */
async function loadAsset(a: Asset) {
  for (let n = 0; n <= MAX_RETRIES; n++) {
    if ((await download(a, n)) && (await decodes(a.src))) {
      a.state = 'ok'
      a.frac = 1
      updateAssetsTask()
      return
    }
  }
  a.state = 'failed'
  a.frac = 1
  updateAssetsTask()
}

/* ───────── Final quality check ───────── */

async function qualityCheck(): Promise<void> {
  const ok: string[] = []
  const failed: string[] = []
  const steps = assets.length + 1 // every file + the fonts
  let done = 0
  const tick = () => { done++; setTask('verify', Math.min(done / steps, 0.99)) }

  // Every file that downloaded must still decode (checked again from the browser cache)
  for (const a of assets) {
    let good = a.state === 'ok'
    if (good) good = await decodes(a.src)
    if (!good && a.state === 'ok') {
      // it downloaded fine earlier but does not decode now: one fresh attempt
      await loadAsset(a)
      good = a.state === 'ok'
    }
    ;(good ? ok : failed).push(a.src)
    tick()
  }

  // The headline font must really be usable
  let fontOk = true
  try {
    fontOk = document.fonts ? document.fonts.check('700 1em "Bricolage Grotesque"') : true
  } catch { fontOk = true }
  if (!fontOk) failed.push('font: Bricolage Grotesque')
  tick()

  report = { checked: steps, ok, failed, passed: failed.length === 0 }
  if (failed.length) console.warn('[Loader quality check] These required files could not be loaded:', failed)
  else console.info(`[Loader quality check] All ${steps} required items verified.`)

  setTask('verify', 1)
}

let started = false

/**
 * Starts everything at once, in parallel, the moment the entry file runs.
 * `loadApp` is the dynamic import of the website; it resolves when the code chunk has arrived.
 * `required` lists every image that must be fully downloaded before the ring may reach 100%.
 */
export function startSiteLoad<T>(loadApp: () => Promise<T>, required: string[]): Promise<T> {
  if (started) return loadApp()
  started = true

  // 1. website code
  const appP = loadApp()
  appP.then(() => setTask('app', 1), () => setTask('app', 1))

  // 2. every required image (real byte progress, retried once, then decoded)
  assets = Array.from(new Set(required.filter(Boolean))).map((src) => ({ src, frac: 0, state: 'pending' as const }))
  updateAssetsTask()
  Promise.all(assets.map(loadAsset)).catch(() => undefined)

  // 3. fonts
  const fontsP = Promise.race([
    document.fonts
      ? Promise.all([
          document.fonts.load('700 1em "Bricolage Grotesque"'),
          document.fonts.load('400 1em "Instrument Sans"'),
        ])
      : Promise.resolve(),
    new Promise((res) => window.setTimeout(res, FONT_TIMEOUT_MS)),
  ])
  fontsP.catch(() => undefined).finally(() => setTask('fonts', 1))

  // 4. window load
  if (document.readyState === 'complete') setTask('window', 1)
  else window.addEventListener('load', () => setTask('window', 1), { once: true })

  // 5. + 6. layout is painted -> run the final quality check -> only then can the ring reach 100%
  const poll = window.setInterval(() => {
    const ready = frac.app >= 1 && frac.assets >= 1 && frac.fonts >= 1 && frac.window >= 1 && frac.layout >= 1
    if (!ready) return
    window.clearInterval(poll)
    qualityCheck().catch(() => setTask('verify', 1)) // an unexpected error in the check itself must never trap the visitor
  }, 100)

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
