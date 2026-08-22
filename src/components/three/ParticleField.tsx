import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type MutableRefObject } from 'react'
import type { BufferGeometry, Points } from 'three'

import { SCENE } from '@/components/three/sceneConstants'
import type { MotionState } from '@/lib/motion'

/**
 * The particle field, motion spec section 3.3 — one system, count varied by
 * chapter.
 *
 * ALLOCATED ONCE, DRAWN PARTIALLY.
 *
 * The spec moves the count from 500 up to 1200 and back down to 120 across the
 * page. Rebuilding the buffer at each chapter would reshuffle every particle
 * mid-scroll — the field would visibly scramble, which reads as a glitch rather
 * than a scene — and would allocate on the main thread while the reader is
 * moving. So the buffer is created once at the device's peak and the count is
 * expressed with `setDrawRange`, which costs nothing and keeps every particle
 * that stays on screen exactly where it was.
 *
 * Points rather than instanced meshes. At these counts the difference is
 * invisible and Points is one draw call with no per-instance matrix work, which
 * is what keeps the mobile frame budget (section 8: 30 fps sustained) reachable
 * on a phone that is also running the rest of the page.
 */
export function ParticleField({
  capacity,
  motionRef,
}: {
  capacity: number
  motionRef: MutableRefObject<MotionState | null>
}) {
  const points = useRef<Points>(null)
  const geometry = useRef<BufferGeometry>(null)

  const positions = useMemo(() => {
    const array = new Float32Array(capacity * 3)
    const { particleInnerRadius: inner, particleOuterRadius: outer } = SCENE

    for (let i = 0; i < capacity; i++) {
      /*
       * Spherical shell, not a cube.
       *
       * The inner radius keeps particles out of the Core: points drifting
       * through a solid object read as a bug, and chapter 02 takes the camera
       * to Z 2.2 where that would be unmissable.
       *
       * The cube-root on the radius is what makes the distribution even. A
       * uniform random radius crowds particles toward the centre, because a
       * thin shell at radius r has surface area proportional to r squared and
       * so deserves proportionally more of them.
       */
      const u = Math.random()
      const radius = Math.cbrt(u * (outer ** 3 - inner ** 3) + inner ** 3)

      // Uniform on the sphere: acos of a uniform cosine, not a uniform angle.
      // Using a uniform polar angle clusters points at the poles.
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      array[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      array[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      array[i * 3 + 2] = radius * Math.cos(phi)
    }

    return array
  }, [capacity])

  useFrame(() => {
    const motion = motionRef.current
    if (!motion || !geometry.current) return

    geometry.current.setDrawRange(0, Math.min(capacity, Math.max(0, motion.particles)))

    /*
     * Chapter 07: "particles converge inward". The spec asks for convergence
     * rather than a fade, so the whole field contracts toward the Core as the
     * count falls — the points that remain are visibly drawn in rather than
     * simply fewer.
     *
     * Driven off the particle count relative to capacity so it needs no extra
     * state and cannot desynchronise from the count it belongs to.
     */
    if (points.current) {
      const density = motion.particles / capacity
      points.current.scale.setScalar(0.75 + Math.min(1, density) * 0.25)
    }
  })

  return (
    <points ref={points}>
      <bufferGeometry ref={geometry}>
        {/*
         * Keyed by capacity so React replaces the attribute rather than
         * mutating it if the device budget ever changes — switching counts
         * otherwise leaves the old array length attached to the new buffer.
         */}
        <bufferAttribute
          key={capacity}
          attach="attributes-position"
          args={[positions, 3]}
          count={capacity}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={SCENE.particleColor}
        size={SCENE.particleSize}
        sizeAttenuation
        transparent
        opacity={0.65}
        // Additive-free on purpose: additive blending over a dark background
        // blows out to white where particles overlap, and the palette decision
        // was to stay in one hue family.
        depthWrite={false}
      />
    </points>
  )
}
