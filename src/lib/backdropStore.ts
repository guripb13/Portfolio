/** Tiny store so Projects can tell the backdrop which project card is hovered, without re-rendering App. */
let hovered: number | null = null
const subs = new Set<() => void>()

export const setHoveredProject = (i: number | null) => {
  if (hovered === i) return
  hovered = i
  subs.forEach((f) => f())
}
export const getHoveredProject = () => hovered
export const subscribeHoveredProject = (f: () => void) => {
  subs.add(f)
  return () => {
    subs.delete(f)
  }
}
