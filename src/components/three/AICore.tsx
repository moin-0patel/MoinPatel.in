import { useFrame } from '@react-three/fiber'
import { useRef, type MutableRefObject } from 'react'
import type { Group, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three'

import { SCENE } from '@/components/three/sceneConstants'
import type { MotionState } from '@/lib/motion'

/**
 * The AI Core — placeholder geometry, motion spec section 0 "Sequencing".
 *
 * The storyboard is explicit about build order:
 *
 *   "Don't start making the final 3D model yet. First build the experience with
 *    a simple sphere. Then get the camera + scroll + typography + transitions
 *    feeling right. Only after that should we create the beautiful production
 *    AI Core in Blender."
 *
 * Still true in Phase 4, and still the point: the choreography is what is being
 * validated here, and it has to be right before a production model is built
 * against it. An icosphere with a wireframe shell answers every question the
 * spec asks.
 *
 * The inner sphere is emissive rather than lit: the Core is meant to be a light
 * SOURCE in the composition, and a surface that merely reflects a lamp reads as
 * an object in a room instead.
 *
 * Two nested groups on purpose. The outer one carries the scroll-driven
 * rotation and scale; the inner one owns the constant ambient spin. Sharing one
 * group would mean two systems writing the same Euler every frame and the last
 * writer silently winning.
 */
export function AICore({
  animate,
  motionRef,
}: {
  animate: boolean
  motionRef: MutableRefObject<MotionState | null>
}) {
  const outer = useRef<Group>(null)
  const spin = useRef<Group>(null)
  const shell = useRef<Mesh>(null)
  const surface = useRef<MeshStandardMaterial>(null)
  const wire = useRef<MeshBasicMaterial>(null)

  useFrame((_state, delta) => {
    const motion = motionRef.current
    if (!motion) return

    if (outer.current) {
      outer.current.scale.setScalar(motion.scale)
      // Scroll-driven rotation on the OUTER group, ambient spin on the inner
      // one — see the note above about two writers and one Euler.
      outer.current.rotation.y = motion.rotationY
    }

    /*
     * A11Y-10 / motion spec section 7: under reduced motion the ambient spin
     * stops entirely. It carries no information — it exists so the scene does
     * not look frozen — which makes it exactly the kind of motion the
     * preference is about. The Core stays fully rendered; only movement stops.
     *
     * delta-scaled, not per-frame: a fixed increment spins twice as fast on a
     * 120 Hz display as on a 60 Hz one.
     */
    if (animate && spin.current) {
      spin.current.rotation.y += delta * SCENE.ambientSpinRadPerSecond
    }

    if (surface.current) {
      surface.current.emissiveIntensity = motion.emissive
      /*
       * "Opening" the Core — spec section 4, chapter 03.
       *
       * Against placeholder geometry the spec defines opening as three
       * simultaneous moves: the shell's surface drops to 0.35 opacity, the
       * wireframe rises from 0.15 to 0.7, and component nodes scale in. The
       * first two are here. What matters is the readable outcome the spec
       * insists on — "you can now see four parts where there was one" — and
       * that is carried by the capability cards plus the wireframe becoming the
       * dominant read. Component nodes are noted as a deviation rather than
       * faked with geometry the production model will replace anyway.
       */
      surface.current.opacity = 1 - motion.open * 0.65
      surface.current.transparent = motion.open > 0.001
    }

    if (wire.current) {
      wire.current.opacity = SCENE.wireOpacityRest + motion.open * (0.7 - SCENE.wireOpacityRest)
    }

    if (shell.current) {
      // The shell breathes outward as the Core opens, so the gap between
      // surface and structure is visible rather than implied.
      shell.current.scale.setScalar(SCENE.wireShellScale * (1 + motion.open * 0.12))
    }
  })

  return (
    <group ref={outer}>
      <group ref={spin}>
        {/*
         * Detail 4 gives a smooth sphere at a low vertex count. Higher detail
         * is invisible at these camera distances and is paid for on every
         * frame, on every device.
         */}
        <mesh>
          <icosahedronGeometry args={[1, 4]} />
          <meshStandardMaterial
            ref={surface}
            color={SCENE.coreBase}
            emissive={SCENE.coreEmissive}
            emissiveIntensity={SCENE.emissiveRest}
            roughness={0.35}
            metalness={0.1}
          />
        </mesh>

        {/*
         * The wireframe shell, slightly larger so it reads as a structure
         * AROUND the Core rather than z-fighting with its surface. Low detail
         * deliberately: a dense wireframe turns to noise, and the faceting is
         * what makes the object look engineered.
         *
         * 1.16, down from 1.35. Once the Core was scaled up to halo the hero
         * portrait, the shell was multiplying an already-large radius and its
         * struts ran off all four edges of a 1280x900 viewport — the object
         * stopped reading as an object and started reading as background
         * clutter. Tighter shell, same silhouette.
         */}
        <mesh ref={shell} scale={SCENE.wireShellScale}>
          <icosahedronGeometry args={[1, 1]} />
          <meshBasicMaterial
            ref={wire}
            color={SCENE.coreWire}
            wireframe
            transparent
            opacity={SCENE.wireOpacityRest}
          />
        </mesh>
      </group>
    </group>
  )
}
