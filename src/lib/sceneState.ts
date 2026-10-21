/**
 * Tiny mutable store shared between GSAP (writes) and R3F's useFrame (reads).
 * Mutable on purpose: going through React state would re-render 60×/second.
 */
export const sceneState = {
  voxel: 0, // 0 → 1: voxel portrait assemble progress (animated when the voxel view is switched on)
}
