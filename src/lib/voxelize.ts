/**
 * Turns any image into voxel data (positions + colours) by sampling it on a tiny canvas.
 * Replaces the non-existent "voxel-portrait" npm package from the brief — no dependency needed.
 */
export interface VoxelData {
  count: number
  cols: number
  rows: number
  cell: number
  targets: Float32Array // x,y,z per voxel
  colors: Float32Array // r,g,b (0-1) per voxel
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Could not load ${src}`))
    img.src = src
  })

// Brand gradient endpoints (neon blue → deep blue) used to tint the voxels
const BLUE: [number, number, number] = [0.24, 0.55, 1]
const EMBER: [number, number, number] = [0.16, 0.27, 0.78]

export async function voxelize(src: string, maxCols = 46, maxRows = 60, cell = 0.1, depth = 0.9): Promise<VoxelData> {
  const img = await loadImage(src)
  const aspect = img.naturalHeight / img.naturalWidth
  const cols = Math.max(8, Math.min(maxCols, Math.floor(maxRows / aspect)))
  const rows = Math.max(8, Math.round(cols * aspect))

  const canvas = document.createElement('canvas')
  canvas.width = cols
  canvas.height = rows
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('2D canvas unavailable')
  ctx.drawImage(img, 0, 0, cols, rows)
  const px = ctx.getImageData(0, 0, cols, rows).data

  // Detect whether the image has real transparency; if not, strip the backdrop by corner colour.
  let hasAlpha = false
  for (let i = 3; i < px.length; i += 4) if (px[i] < 250) { hasAlpha = true; break }
  const corners = [0, cols - 1, (rows - 1) * cols, rows * cols - 1].map((p) => p * 4)
  const bg = [0, 1, 2].map((c) => corners.reduce((s, o) => s + px[o + c], 0) / 4)

  const pos: number[] = []
  const col: number[] = []
  for (let i = 0; i < cols * rows; i++) {
    const o = i * 4
    const [r, g, b, a] = [px[o], px[o + 1], px[o + 2], px[o + 3]]
    if (a < 128) continue
    if (!hasAlpha && Math.hypot(r - bg[0], g - bg[1], b - bg[2]) < 48) continue

    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    const cx = i % cols
    const cy = Math.floor(i / cols)
    pos.push((cx - cols / 2) * cell, -(cy - rows / 2) * cell, lum * depth)

    // Blend the photo's own colour with a blue→deep-blue gradient so it matches the site palette
    const t = cy / rows
    const shade = 0.35 + lum * 0.9
    for (let c = 0; c < 3; c++) {
      const tint = (BLUE[c] * (1 - t) + EMBER[c] * t) * shade
      col.push(((c === 0 ? r : c === 1 ? g : b) / 255) * 0.45 + tint * 0.75)
    }
  }
  return { count: pos.length / 3, cols, rows, cell, targets: new Float32Array(pos), colors: new Float32Array(col) }
}
