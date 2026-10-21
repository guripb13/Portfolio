import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { voxelize, type VoxelData } from '../lib/voxelize'
import { sceneState } from '../lib/sceneState'
import { useInView } from '../lib/useInView'
import { useMedia, useReducedMotion } from '../lib/useMedia'
import ErrorBoundary from './ErrorBoundary'

/**
 * One InstancedMesh = one draw call for ~2,500 cubes. Voxels start scattered and assemble into the
 * portrait as the About section scrolls in; the pointer pushes nearby voxels away and tilts the bust.
 */
function Voxels({ data, reduced, progress }: { data: VoxelData; reduced: boolean; progress: { voxel: number } }) {
  const group = useRef<THREE.Group>(null)
  const mesh = useRef<THREE.InstancedMesh>(null)
  const { viewport, invalidate } = useThree()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  // Scattered starting positions + live positions (allocated once, mutated every frame)
  const scatter = useMemo(() => {
    const a = new Float32Array(data.count * 3)
    for (let i = 0; i < data.count; i++) {
      const r = 3.5 + Math.random() * 5, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1)
      a[i * 3] = r * Math.sin(ph) * Math.cos(th)
      a[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th)
      a[i * 3 + 2] = r * Math.cos(ph)
    }
    return a
  }, [data])
  const cur = useMemo(() => Float32Array.from(scatter), [scatter])

  useLayoutEffect(() => {
    const m = mesh.current
    if (!m) return
    const c = new THREE.Color()
    for (let i = 0; i < data.count; i++) {
      c.setRGB(data.colors[i * 3], data.colors[i * 3 + 1], data.colors[i * 3 + 2], THREE.SRGBColorSpace)
      m.setColorAt(i, c)
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    invalidate()
  }, [data, invalidate])

  const scale = Math.min((viewport.width * 0.92) / (data.cols * data.cell), (viewport.height * 0.92) / (data.rows * data.cell))

  useFrame((state, dt) => {
    const m = mesh.current, g = group.current
    if (!m || !g) return
    const t = state.clock.elapsedTime
    const asm = reduced ? 1 : THREE.MathUtils.smoothstep(progress.voxel, 0.05, 0.85)
    const k = reduced ? 1 : 1 - Math.exp(-dt * 8)
    const px = (state.pointer.x * viewport.width) / 2 / scale
    const py = (state.pointer.y * viewport.height) / 2 / scale
    const R = 0.9

    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, reduced ? 0 : state.pointer.x * 0.4, 3, dt)
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, reduced ? 0 : -state.pointer.y * 0.22, 3, dt)

    for (let i = 0; i < data.count; i++) {
      const o = i * 3
      let tx = scatter[o] + (data.targets[o] - scatter[o]) * asm
      let ty = scatter[o + 1] + (data.targets[o + 1] - scatter[o + 1]) * asm
      let tz = scatter[o + 2] + (data.targets[o + 2] - scatter[o + 2]) * asm
      if (!reduced && asm > 0.9) {
        tz += Math.sin(t * 1.4 + tx * 3 + ty * 2) * 0.03
        const dx = tx - px, dy = ty - py, d = Math.hypot(dx, dy)
        if (d < R) { const f = (1 - d / R) ** 2; tx += (dx / (d || 1)) * f * 0.5; ty += (dy / (d || 1)) * f * 0.5; tz += f * 0.9 }
      }
      cur[o] += (tx - cur[o]) * k
      cur[o + 1] += (ty - cur[o + 1]) * k
      cur[o + 2] += (tz - cur[o + 2]) * k
      dummy.position.set(cur[o], cur[o + 1], cur[o + 2])
      dummy.scale.setScalar(data.cell * 0.9 * (0.55 + 0.45 * asm))
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })

  return (
    <group ref={group} scale={scale}>
      <instancedMesh key={data.count} ref={mesh} args={[undefined, undefined, data.count]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.35} metalness={0.25} />
      </instancedMesh>
    </group>
  )
}

/** In on-demand mode, render a short burst of frames so the first paint is never blank or half-lit. */
function Settle() {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    let n = 0
    const id = window.setInterval(() => { invalidate(); if (++n > 40) window.clearInterval(id) }, 50)
    return () => window.clearInterval(id)
  }, [invalidate])
  return null
}

export default function VoxelPortrait({ src, state = sceneState }: { src: string; state?: { voxel: number } }) {
  const wrap = useRef<HTMLDivElement>(null)
  const inView = useInView(wrap)
  const reduced = useReducedMotion()
  const small = useMedia('(max-width: 767px)')
  const [data, setData] = useState<VoxelData | null>(null)

  useEffect(() => {
    let alive = true
    voxelize(src, small ? 34 : 46, small ? 44 : 60).then((d) => alive && setData(d)).catch(() => alive && setData(null))
    return () => { alive = false }
  }, [src, small])

  return (
    <div ref={wrap} className="absolute inset-0" aria-hidden="true">
      <ErrorBoundary>
        <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0, 10], fov: 35 }} frameloop={reduced ? 'demand' : inView ? 'always' : 'never'} gl={{ antialias: true, alpha: true }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[-4, 3, 5]} intensity={2.4} color="#6fa6ff" />
          <directionalLight position={[4, -3, 3]} intensity={2} color="#2846c8" />
          {data && <Voxels data={data} reduced={reduced} progress={state} />}
          {reduced && <Settle />}
        </Canvas>
      </ErrorBoundary>
    </div>
  )
}
