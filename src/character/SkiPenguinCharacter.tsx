import { RoundedBox, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

/** Per-frame rider motion, mutated by the controller and read in useFrame. */
export interface CharacterMotion {
  bankRoll: number
  speed: number
}

interface SkiPenguinCharacterProps {
  /** Color accent for active spell / energy trim */
  readonly spellColor?: string
  /** Per-frame rider motion ref */
  readonly motionRef: React.RefObject<CharacterMotion>
  /** Scale factor for character sizing */
  readonly scale?: number
}

/**
 * Approved optimized rider model. Served from `public/`, so the path must carry
 * Vite's base — the app deploys under a GitHub Pages subpath.
 */
const PENGUIN_MODEL_PATH = `${import.meta.env.BASE_URL}models/peng.glb`

/**
 * Authored bounding box of `peng.glb`: exactly 1.0 unit tall, centred on its
 * own origin (y spans -0.500 to +0.500). Positioning below derives from this,
 * so changing PENGUIN_SCALE keeps the feet planted.
 */
const PENGUIN_MODEL_HEIGHT = 1.0

/** Rider height in board units. The deck is 2.5 long and 0.55 wide. */
const PENGUIN_SCALE = 1.55

/** Binding pads top out at y = 0.20; the feet sit just into the straps. */
const PENGUIN_FEET_Y = 0.18

const PENGUIN_Y = PENGUIN_FEET_Y + (PENGUIN_MODEL_HEIGHT / 2) * PENGUIN_SCALE

/**
 * The model is authored facing +X: its toes extend to +X (feet span x
 * -0.079..0.194 while z stays symmetric at ±0.207) and the head's largest
 * protrusion is +X. Travel is +Z.
 *
 * A yaw of 0 therefore leaves the rider facing across the board — the
 * snowboard stance, confirmed on device. Use `Math.PI` to switch to the
 * opposite (goofy) stance, or `-Math.PI / 2` to face down the hill.
 */
const PENGUIN_YAW = 0

function create80sBoardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 1024
  const ctx = canvas.getContext('2d')!

  // Matte Deep Indigo Base
  ctx.fillStyle = '#1e293b'
  ctx.fillRect(0, 0, 512, 1024)

  // Cyber Grid Lines
  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 3
  for (let y = 0; y < 1024; y += 40) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(512, y)
    ctx.stroke()
  }
  for (let x = 0; x < 512; x += 40) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, 1024)
    ctx.stroke()
  }

  // Matte Deck Racing Stripes
  ctx.fillStyle = '#db2777'
  ctx.fillRect(96, 60, 320, 904)

  ctx.fillStyle = '#0284c7'
  ctx.fillRect(160, 100, 192, 824)

  ctx.fillStyle = '#ca8a04'
  ctx.fillRect(224, 140, 64, 744)

  // Retro Typography Text
  ctx.fillStyle = '#f8fafc'
  ctx.font = 'bold 44px sans-serif'
  ctx.textAlign = 'center'
  ctx.save()
  ctx.translate(256, 512)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('SNOW VR ★ 1980', 0, 14)
  ctx.restore()

  return new THREE.CanvasTexture(canvas)
}

/**
 * Loads the approved rider GLB.
 *
 * `useGLTF` caches one parsed scene per URL, so the graph is cloned before it
 * reaches the scene: mutating the cached original would leak shadow flags into
 * every future instance. Geometry and materials are shared by the clone, which
 * is what we want — one mesh, one material, one draw call.
 */
function PenguinModel() {
  const { scene } = useGLTF(PENGUIN_MODEL_PATH)

  const model = useMemo(() => {
    const instance = scene.clone(true)
    instance.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    return instance
  }, [scene])

  return <primitive object={model} />
}

useGLTF.preload(PENGUIN_MODEL_PATH)

/**
 * Ski Penguin player character.
 *
 * The snowboard — deck, spell-coloured edge rails, and bindings — stays
 * procedural. The rider is the approved optimized GLB.
 *
 * The GLB carries no skeleton, so there is no per-limb animation. All motion is
 * applied to the whole body: a secondary lean into turns and a speed-driven
 * crouch. This is a known limitation of the model, not of the integration.
 */
export function SkiPenguinCharacter({
  spellColor = '#00f0ff',
  motionRef,
  scale = 1.0,
}: SkiPenguinCharacterProps) {
  const riderRef = useRef<THREE.Group>(null)
  const boardTexture = useMemo(() => create80sBoardTexture(), [])

  useEffect(() => () => boardTexture.dispose(), [boardTexture])

  useFrame((state) => {
    const rider = riderRef.current
    if (!rider) return

    const t = state.clock.getElapsedTime()
    const bankRoll = motionRef.current?.bankRoll ?? 0
    const speed = motionRef.current?.speed ?? 0

    // Secondary body lean. The parent boardGroup in SnowSurferController
    // already rolls the whole character by bankRoll, so this is a deliberate
    // fraction of it — an upper-body follow-through, not a second full lean.
    rider.rotation.z = bankRoll * 0.35

    // Crouch into speed, with a gentle idle bob.
    const crouch = Math.min(speed / 34, 1) * 0.06
    rider.position.y = PENGUIN_Y - crouch + Math.sin(t * 2.2) * 0.012
  })

  return (
    <group scale={scale}>
      {/* ─── SNOWBOARD DECK & BINDINGS ─── */}
      <group position={[0, 0, 0]}>
        {/* Smooth Rounded Snowboard Base */}
        <RoundedBox position={[0, 0.08, 0]} args={[0.55, 0.07, 2.5]} radius={0.03} smoothness={8}>
          <meshStandardMaterial
            map={boardTexture}
            roughness={0.65}
            metalness={0.05}
          />
        </RoundedBox>

        {/* Dynamic Spell Energy Edge Rails */}
        <RoundedBox position={[-0.27, 0.08, 0]} args={[0.02, 0.06, 2.48]} radius={0.008} smoothness={4}>
          <meshStandardMaterial color={spellColor} emissive={spellColor} emissiveIntensity={1.8} />
        </RoundedBox>
        <RoundedBox position={[0.27, 0.08, 0]} args={[0.02, 0.06, 2.48]} radius={0.008} smoothness={4}>
          <meshStandardMaterial color={spellColor} emissive={spellColor} emissiveIntensity={1.8} />
        </RoundedBox>

        {/* Smooth Front & Rear Bindings */}
        <group position={[0, 0.16, -0.45]}>
          <RoundedBox args={[0.38, 0.08, 0.28]} radius={0.02} smoothness={6}>
            <meshStandardMaterial color="#334155" roughness={0.7} metalness={0.0} />
          </RoundedBox>
          <mesh position={[0, 0.06, 0]}>
            <torusGeometry args={[0.16, 0.03, 32, 64, Math.PI]} />
            <meshStandardMaterial color="#db2777" roughness={0.8} />
          </mesh>
        </group>
        <group position={[0, 0.16, 0.45]}>
          <RoundedBox args={[0.38, 0.08, 0.28]} radius={0.02} smoothness={6}>
            <meshStandardMaterial color="#334155" roughness={0.7} metalness={0.0} />
          </RoundedBox>
          <mesh position={[0, 0.06, 0]}>
            <torusGeometry args={[0.16, 0.03, 32, 64, Math.PI]} />
            <meshStandardMaterial color="#db2777" roughness={0.8} />
          </mesh>
        </group>
      </group>

      {/*
        ─── RIDER ───
        Outer group carries position and the animated roll, so the lean happens
        about the board's long axis. Inner group carries the static facing yaw
        and scale, keeping the two rotations from coupling through one Euler.
      */}
      <group ref={riderRef} position={[0, PENGUIN_Y, 0]}>
        <group rotation={[0, PENGUIN_YAW, 0]} scale={PENGUIN_SCALE}>
          <Suspense fallback={null}>
            <PenguinModel />
          </Suspense>
        </group>
      </group>
    </group>
  )
}
