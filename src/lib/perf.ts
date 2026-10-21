/** Runs fn at most once per `ms`, with a trailing call so the final state is never missed. */
export const throttle = <A extends unknown[]>(fn: (...a: A) => void, ms: number) => {
  let last = 0
  let t = 0
  return (...a: A) => {
    const now = performance.now()
    const wait = ms - (now - last)
    if (wait <= 0) { last = now; fn(...a) }
    else if (!t) t = window.setTimeout(() => { t = 0; last = performance.now(); fn(...a) }, wait)
  }
}
