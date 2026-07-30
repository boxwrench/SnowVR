import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
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
 * Procedural Canvas Texture Generators for 1980's Ski Penguin.
 */
function create80sJacketTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')!

  // Hot Pink 80s Base
  ctx.fillStyle = '#e6006f'
  ctx.fillRect(0, 0, 512, 512)

  // Subtle Matte Synthwave Grid
  ctx.strokeStyle = 'rgba(46, 16, 101, 0.25)'
  ctx.lineWidth = 4
  const step = 32
  for (let x = 0; x <= 512; x += step) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, 512)
    ctx.stroke()
  }
  for (let y = 0; y <= 512; y += step) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(512, y)
    ctx.stroke()
  }

  // Electric Cyan Diagonal Chevron Stripes
  ctx.fillStyle = '#0891b2'
  for (let i = -2; i < 6; i++) {
    ctx.beginPath()
    ctx.moveTo(i * 120, 0)
    ctx.lineTo(i * 120 + 80, 0)
    ctx.lineTo(i * 120 + 200, 512)
    ctx.lineTo(i * 120 + 120, 512)
    ctx.closePath()
    ctx.fill()
  }

  // Neon Yellow Retro Triangles
  ctx.fillStyle = '#eab308'
  for (let y = 40; y < 512; y += 140) {
    for (let x = 30; x < 512; x += 160) {
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + 35, y + 45)
      ctx.lineTo(x - 25, y + 40)
      ctx.closePath()
      ctx.fill()
    }
  }

  // Soft Cloth Fabric Grain Noise
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
  for (let i = 0; i < 5000; i++) {
    const rx = Math.random() * 512
    const ry = Math.random() * 512
    ctx.fillRect(rx, ry, 2, 2)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

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

  const texture = new THREE.CanvasTexture(canvas)
  return texture
}

function createVisorGradientTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const ctx = canvas.getContext('2d')!

  const grad = ctx.createLinearGradient(0, 0, 512, 0)
  grad.addColorStop(0, '#0284c7')
  grad.addColorStop(0.25, '#7e22ce')
  grad.addColorStop(0.5, '#db2777')
  grad.addColorStop(0.75, '#ea580c')
  grad.addColorStop(1.0, '#ca8a04')

  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 512, 128)

  // Metallic Visor Streaks
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.lineWidth = 8
  ctx.beginPath()
  ctx.moveTo(100, 0)
  ctx.lineTo(180, 128)
  ctx.stroke()

  const texture = new THREE.CanvasTexture(canvas)
  return texture
}

function createKnitBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, 256, 256)

  // Knitting Ribbed Weave Pattern
  ctx.fillStyle = '#c0c0c0'
  for (let y = 0; y < 256; y += 6) {
    for (let x = (y % 12 === 0 ? 0 : 3); x < 256; x += 6) {
      ctx.fillRect(x, y, 3, 3)
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(8, 8)
  return texture
}

function createFeatherBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, 256, 256)

  // Soft Downy Feather Stipple Pattern
  for (let i = 0; i < 3000; i++) {
    const rx = Math.random() * 256
    const ry = Math.random() * 256
    const brightness = Math.floor(90 + Math.random() * 80)
    ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`
    ctx.fillRect(rx, ry, 2, 3)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(4, 4)
  return texture
}

/**
 * 1980's Ski Penguin 3D Player Character Component.
 *
 * Upgraded with ultra-smooth high-poly geometries & RoundedBoxes:
 * - High-segment spheres (64x64), capsules (32x64), cylinders (64), toruses (32x64).
 * - Smooth filleted RoundedBoxes for deck, goggles frame, visor, flippers, bindings, and feet.
 * - Non-shiny matte fabric PBR materials.
 * - Outward dynamic balancing flipper posture.
 */
export function SkiPenguinCharacter({
  spellColor = '#00f0ff',
  motionRef,
  scale = 1.0,
}: SkiPenguinCharacterProps) {
  const headGroupRef = useRef<THREE.Group>(null)
  const scarfTailRef = useRef<THREE.Group>(null)
  const leftFlipperRef = useRef<THREE.Group>(null)
  const rightFlipperRef = useRef<THREE.Group>(null)
  const pomPomRef = useRef<THREE.Mesh>(null)

  const jacketTexture = useMemo(() => create80sJacketTexture(), [])
  const boardTexture = useMemo(() => create80sBoardTexture(), [])
  const visorTexture = useMemo(() => createVisorGradientTexture(), [])
  const knitBumpTexture = useMemo(() => createKnitBumpTexture(), [])
  const featherBumpTexture = useMemo(() => createFeatherBumpTexture(), [])

  useEffect(() => {
    const textures = [
      jacketTexture,
      boardTexture,
      visorTexture,
      knitBumpTexture,
      featherBumpTexture,
    ]
    return () => {
      for (const texture of textures) texture.dispose()
    }
  }, [jacketTexture, boardTexture, visorTexture, knitBumpTexture, featherBumpTexture])

  // Dynamic Micro-Animations per frame
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    const bankRoll = motionRef.current?.bankRoll ?? 0
    const speed = motionRef.current?.speed ?? 0

    // Scarf fluttering in wind
    if (scarfTailRef.current) {
      const flutter = Math.sin(t * (8 + speed * 0.4)) * (0.12 + speed * 0.01)
      scarfTailRef.current.rotation.z = -0.45 + flutter
      scarfTailRef.current.rotation.x = 0.25 + Math.cos(t * 6) * 0.08
    }

    // Head tilting dynamically into turns
    if (headGroupRef.current) {
      headGroupRef.current.rotation.z = bankRoll * 0.35
      headGroupRef.current.rotation.y = Math.sin(t * 1.2) * 0.04
    }

    // Athletic outward flipper balancing posture
    if (leftFlipperRef.current) {
      leftFlipperRef.current.rotation.z = 0.72 + bankRoll * 0.45 + Math.sin(t * 3.5) * 0.05
      leftFlipperRef.current.rotation.x = 0.15 - bankRoll * 0.2
    }
    if (rightFlipperRef.current) {
      rightFlipperRef.current.rotation.z = -0.72 + bankRoll * 0.45 - Math.sin(t * 3.5) * 0.05
      rightFlipperRef.current.rotation.x = -0.15 - bankRoll * 0.2
    }

    // Pom-pom subtle bounce
    if (pomPomRef.current) {
      pomPomRef.current.position.y = 0.32 + Math.abs(Math.sin(t * 5 + speed * 0.15)) * 0.03
    }
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

      {/* ─── PENGUIN FEET ─── */}
      <group position={[0, 0.2, 0]}>
        {/* Left Webbed Foot (Smooth Rounded Foot) */}
        <group position={[-0.15, 0, -0.42]} rotation={[0.1, -0.2, 0]}>
          <RoundedBox args={[0.16, 0.06, 0.34]} radius={0.02} smoothness={6}>
            <meshStandardMaterial color="#ea580c" roughness={0.8} metalness={0.0} />
          </RoundedBox>
        </group>
        {/* Right Webbed Foot */}
        <group position={[0.15, 0, 0.42]} rotation={[0.1, 0.2, 0]}>
          <RoundedBox args={[0.16, 0.06, 0.34]} radius={0.02} smoothness={6}>
            <meshStandardMaterial color="#ea580c" roughness={0.8} metalness={0.0} />
          </RoundedBox>
        </group>
      </group>

      {/* ─── PENGUIN BODY & 80s NEON SKI SUIT ─── */}
      <group position={[0, 0.75, 0]}>
        {/* Main Body Torso (Ultra-Smooth 32x64 Capsule) */}
        <mesh position={[0, 0, 0]}>
          <capsuleGeometry args={[0.32, 0.55, 32, 64]} />
          <meshStandardMaterial
            color="#0f172a"
            bumpMap={featherBumpTexture}
            bumpScale={0.015}
            roughness={0.9}
            metalness={0.0}
          />
        </mesh>

        {/* White Penguin Belly Patch (Smooth 64x64 Sphere) */}
        <mesh position={[0, -0.05, 0.15]} scale={[0.8, 0.85, 0.5]}>
          <sphereGeometry args={[0.32, 64, 64]} />
          <meshStandardMaterial
            color="#f8fafc"
            bumpMap={featherBumpTexture}
            bumpScale={0.012}
            roughness={0.88}
            metalness={0.0}
          />
        </mesh>

        {/* 1980s Technical Nylon Ski Suit (Smooth 64-Segment Cylinder) */}
        <mesh position={[0, 0.02, 0.02]}>
          <cylinderGeometry args={[0.34, 0.36, 0.5, 64, 16]} />
          <meshStandardMaterial
            map={jacketTexture}
            roughness={0.85}
            metalness={0.0}
          />
        </mesh>

        {/* 80s Geometric Turquoise Diagonal Chevron Trim (Smooth Rounded Contour) */}
        <group position={[0, 0.12, 0.05]} rotation={[0.15, 0, 0.2]}>
          <RoundedBox args={[0.62, 0.1, 0.55]} radius={0.03} smoothness={6}>
            <meshStandardMaterial color="#0891b2" roughness={0.8} metalness={0.0} />
          </RoundedBox>
        </group>

        {/* 80s Neon Yellow Accent Belt */}
        <mesh position={[0, -0.18, 0.02]}>
          <cylinderGeometry args={[0.35, 0.35, 0.07, 64]} />
          <meshStandardMaterial color="#ca8a04" roughness={0.75} emissive="#ca8a04" emissiveIntensity={0.25} />
        </mesh>

        {/* Cute Penguin Tail (Smooth 32-Segment Cone) */}
        <mesh position={[0, -0.25, -0.3]} rotation={[-0.4, 0, 0]}>
          <coneGeometry args={[0.12, 0.25, 32]} />
          <meshStandardMaterial color="#0f172a" bumpMap={featherBumpTexture} bumpScale={0.015} roughness={0.9} />
        </mesh>

        {/* ─── PENGUIN FLIPPERS (SMOOTH ROUNDED + EXTENDED OUTWARD) & SKI POLES ─── */}
        {/* Left Flipper */}
        <group ref={leftFlipperRef} position={[-0.46, 0.12, -0.05]} rotation={[0.15, 0, 0.72]}>
          {/* Smooth Flipper Arm */}
          <group position={[0, -0.2, 0]}>
            <RoundedBox args={[0.07, 0.48, 0.22]} radius={0.03} smoothness={8}>
              <meshStandardMaterial map={jacketTexture} roughness={0.85} metalness={0.0} />
            </RoundedBox>
          </group>
          {/* Smooth Flipper Tip */}
          <mesh position={[0, -0.44, 0]}>
            <coneGeometry args={[0.075, 0.18, 32]} />
            <meshStandardMaterial color="#0f172a" bumpMap={featherBumpTexture} roughness={0.9} />
          </mesh>

          {/* Left Ski Pole */}
          <group position={[-0.06, -0.35, 0.05]} rotation={[0.4, 0.2, -0.45]}>
            <mesh position={[0, 0.3, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 0.18, 32]} />
              <meshStandardMaterial color="#db2777" roughness={0.85} />
            </mesh>
            <mesh position={[0, -0.4, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 1.4, 32]} />
              <meshStandardMaterial color="#0284c7" roughness={0.5} metalness={0.3} />
            </mesh>
            <mesh position={[0, -1.0, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 0.015, 32]} />
              <meshStandardMaterial color="#eab308" roughness={0.85} />
            </mesh>
            <mesh position={[0, -1.08, 0]}>
              <coneGeometry args={[0.015, 0.12, 24]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.4} />
            </mesh>
          </group>
        </group>

        {/* Right Flipper */}
        <group ref={rightFlipperRef} position={[0.46, 0.12, 0.05]} rotation={[-0.15, 0, -0.72]}>
          <group position={[0, -0.2, 0]}>
            <RoundedBox args={[0.07, 0.48, 0.22]} radius={0.03} smoothness={8}>
              <meshStandardMaterial map={jacketTexture} roughness={0.85} metalness={0.0} />
            </RoundedBox>
          </group>
          <mesh position={[0, -0.44, 0]}>
            <coneGeometry args={[0.075, 0.18, 32]} />
            <meshStandardMaterial color="#0f172a" bumpMap={featherBumpTexture} roughness={0.9} />
          </mesh>

          {/* Right Ski Pole */}
          <group position={[0.06, -0.35, 0.05]} rotation={[0.4, -0.2, 0.45]}>
            <mesh position={[0, 0.3, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 0.18, 32]} />
              <meshStandardMaterial color="#db2777" roughness={0.85} />
            </mesh>
            <mesh position={[0, -0.4, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 1.4, 32]} />
              <meshStandardMaterial color="#0284c7" roughness={0.5} metalness={0.3} />
            </mesh>
            <mesh position={[0, -1.0, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 0.015, 32]} />
              <meshStandardMaterial color="#eab308" roughness={0.85} />
            </mesh>
            <mesh position={[0, -1.08, 0]}>
              <coneGeometry args={[0.015, 0.12, 24]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.4} />
            </mesh>
          </group>
        </group>

        {/* ─── DYNAMIC WIND NECK SCARF ─── */}
        <group position={[0, 0.3, 0]}>
          {/* Smooth Torus Scarf Collar */}
          <mesh position={[0, 0, 0]}>
            <torusGeometry args={[0.26, 0.07, 32, 64]} />
            <meshStandardMaterial
              color="#0891b2"
              bumpMap={knitBumpTexture}
              bumpScale={0.03}
              roughness={0.92}
              metalness={0.0}
            />
          </mesh>
          {/* Animated Flapping Scarf Tail (Smooth Rounded Box) */}
          <group
            ref={scarfTailRef}
            position={[0.18, -0.15, -0.2]}
            rotation={[0.4, 0.3, -0.5]}
          >
            <RoundedBox args={[0.1, 0.45, 0.03]} radius={0.01} smoothness={4}>
              <meshStandardMaterial
                color="#0891b2"
                bumpMap={knitBumpTexture}
                bumpScale={0.03}
                roughness={0.92}
                metalness={0.0}
              />
            </RoundedBox>
          </group>
        </group>
      </group>

      {/* ─── PENGUIN HEAD & 80s ACCESSORIES ─── */}
      <group ref={headGroupRef} position={[0, 1.25, 0]}>
        {/* Head Sphere (Ultra-Smooth 64x64 Sphere) */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.28, 64, 64]} />
          <meshStandardMaterial
            color="#0f172a"
            bumpMap={featherBumpTexture}
            bumpScale={0.015}
            roughness={0.9}
            metalness={0.0}
          />
        </mesh>

        {/* White Face Patch (Smooth 64x64 Sphere) */}
        <mesh position={[0, -0.02, 0.14]} scale={[0.75, 0.65, 0.5]}>
          <sphereGeometry args={[0.25, 64, 64]} />
          <meshStandardMaterial
            color="#f8fafc"
            bumpMap={featherBumpTexture}
            bumpScale={0.012}
            roughness={0.88}
            metalness={0.0}
          />
        </mesh>

        {/* Cute Orange Beak (Smooth 48-Segment Cone) */}
        <mesh position={[0, -0.04, 0.28]} rotation={[0.3, 0, 0]}>
          <coneGeometry args={[0.09, 0.22, 48]} />
          <meshStandardMaterial color="#ea580c" roughness={0.75} metalness={0.0} />
        </mesh>

        {/* Penguin Eyes */}
        <group position={[-0.1, 0.06, 0.22]}>
          <mesh>
            <sphereGeometry args={[0.038, 32, 32]} />
            <meshStandardMaterial color="#020617" roughness={0.3} metalness={0.0} />
          </mesh>
          <mesh position={[0.01, 0.01, 0.025]}>
            <sphereGeometry args={[0.012, 24, 24]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
        <group position={[0.1, 0.06, 0.22]}>
          <mesh>
            <sphereGeometry args={[0.038, 32, 32]} />
            <meshStandardMaterial color="#020617" roughness={0.3} metalness={0.0} />
          </mesh>
          <mesh position={[-0.01, 0.01, 0.025]}>
            <sphereGeometry args={[0.012, 24, 24]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>

        {/* ─── 1980s OVERSIZED MIRRORED SKI GOGGLES (ROUNDED CONTOURS) ─── */}
        <group position={[0, 0.06, 0.18]}>
          {/* Purple Goggles Frame (Filleted Smooth Rounded Box) */}
          <RoundedBox args={[0.44, 0.15, 0.14]} radius={0.04} smoothness={8}>
            <meshStandardMaterial color="#7e22ce" roughness={0.8} metalness={0.0} />
          </RoundedBox>
          {/* Sunset Mirrored Iridescent Visor Lens */}
          <group position={[0, 0, 0.04]}>
            <RoundedBox args={[0.4, 0.12, 0.08]} radius={0.035} smoothness={8}>
              <meshStandardMaterial
                map={visorTexture}
                roughness={0.08}
                metalness={0.85}
              />
            </RoundedBox>
          </group>
          {/* Elastic Goggles Strap */}
          <mesh position={[0, 0, -0.1]}>
            <torusGeometry args={[0.29, 0.03, 32, 64]} />
            <meshStandardMaterial color="#7e22ce" roughness={0.85} metalness={0.0} />
          </mesh>
        </group>

        {/* ─── 1980s NEON PURPLE KNIT BEANIE & POM-POM (HIGH SEGMENT) ─── */}
        <group position={[0, 0.18, 0]}>
          {/* Beanie Main Cap (Smooth 64x48 Hemisphere) */}
          <mesh position={[0, 0.04, 0]}>
            <sphereGeometry args={[0.28, 64, 48, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            <meshStandardMaterial
              color="#7e22ce"
              bumpMap={knitBumpTexture}
              bumpScale={0.04}
              roughness={0.95}
              metalness={0.0}
            />
          </mesh>
          {/* Folded Beanie Cuff Ring (Smooth 32x64 Torus) */}
          <mesh position={[0, 0, 0]}>
            <torusGeometry args={[0.28, 0.055, 32, 64]} />
            <meshStandardMaterial
              color="#db2777"
              bumpMap={knitBumpTexture}
              bumpScale={0.04}
              roughness={0.95}
              metalness={0.0}
            />
          </mesh>
          {/* Fluffy Pom-Pom on Top (Smooth 48x48 Sphere) */}
          <mesh ref={pomPomRef} position={[0, 0.32, 0]}>
            <sphereGeometry args={[0.085, 48, 48]} />
            <meshStandardMaterial
              color="#ca8a04"
              bumpMap={knitBumpTexture}
              bumpScale={0.06}
              roughness={0.98}
              metalness={0.0}
            />
          </mesh>
        </group>
      </group>
    </group>
  )
}
