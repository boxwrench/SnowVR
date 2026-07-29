import { useFrame, useThree } from '@react-three/fiber'
import { useXR, XROrigin } from '@react-three/xr'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { SpellEffect } from '../experiments/SpellManager'

interface SnowSurferControllerProps {
  readonly activeSpell: SpellEffect
  readonly onBrushUpdate: (
    pos: THREE.Vector3,
    depth: number,
    berm: number,
    ice: number,
    wetness: number
  ) => void
  readonly followCamera?: boolean
}

export function SnowSurferController({
  activeSpell,
  onBrushUpdate,
  followCamera = true,
}: SnowSurferControllerProps) {
  const { camera } = useThree()
  const session = useXR((state) => state.session)
  
  // Character Physics State
  const position = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0))
  const velocity = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0))
  const heading = useRef<number>(0) // Yaw angle in radians
  const bankRoll = useRef<number>(0) // Roll angle for turning lean

  // VR 3rd-Person Origin Tracking
  const xrOriginPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 3, 6))

  // Key States
  const keys = useRef<{
    forward: boolean
    backward: boolean
    left: boolean
    right: boolean
    boost: boolean
  }>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    boost: false,
  })

  const characterGroupRef = useRef<THREE.Group>(null)
  const boardGroupRef = useRef<THREE.Group>(null)
  const xrOriginRef = useRef<THREE.Group>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.current.forward = true
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.current.backward = true
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.current.left = true
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.current.right = true
      if (e.key === ' ') keys.current.boost = true
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.current.forward = false
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.current.backward = false
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.current.left = false
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.current.right = false
      if (e.key === ' ') keys.current.boost = false
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useFrame((_, delta) => {
    // 1. High-Speed Steering & Acceleration Logic
    const turnSpeed = 3.2 * delta
    const maxSpeed = keys.current.boost ? 65.0 : 38.0
    const accelRate = (keys.current.boost ? 65.0 : 42.0) * delta
    const friction = 0.965

    let targetBank = 0

    if (keys.current.left) {
      heading.current += turnSpeed
      targetBank = -0.42 // Deep turn lean
    }
    if (keys.current.right) {
      heading.current -= turnSpeed
      targetBank = 0.42 // Deep turn lean
    }

    // Smooth leaning interpolation
    bankRoll.current += (targetBank - bankRoll.current) * 10.0 * delta

    // Forward/Backward acceleration
    const moveDir = new THREE.Vector3(
      Math.sin(heading.current),
      0,
      Math.cos(heading.current)
    )

    if (keys.current.forward) {
      velocity.current.addScaledVector(moveDir, accelRate)
    } else if (keys.current.backward) {
      velocity.current.addScaledVector(moveDir, -accelRate * 0.5)
    }

    // Apply friction and clamp speed
    velocity.current.multiplyScalar(friction)
    if (velocity.current.length() > maxSpeed) {
      velocity.current.setLength(maxSpeed)
    }

    // Update 3D position
    position.current.addScaledVector(velocity.current, delta)
    position.current.x = THREE.MathUtils.clamp(position.current.x, -56, 56)
    position.current.z = THREE.MathUtils.clamp(position.current.z, -56, 56)

    const speed = velocity.current.length()

    // 2. Character Mesh Placement & Leaning
    if (characterGroupRef.current) {
      characterGroupRef.current.position.copy(position.current)
      characterGroupRef.current.rotation.y = heading.current
    }
    if (boardGroupRef.current) {
      boardGroupRef.current.rotation.z = bankRoll.current
    }

    // 3. Continuous Snow Carving — spells use their castMultiplier for dramatic effects
    if (speed > 0.5) {
      const mult = activeSpell.castMultiplier
      const brushVec = new THREE.Vector3(
        position.current.x,
        position.current.z,
        activeSpell.brushRadius * (1.0 + speed * 0.02)
      )
      
      onBrushUpdate(
        brushVec,
        activeSpell.brushDepth * mult * (0.6 + speed * 0.02),
        activeSpell.brushBerm * mult * (0.6 + Math.abs(bankRoll.current) * 2.0),
        activeSpell.brushIce * mult,
        activeSpell.brushWetness * mult
      )
    }

    // 4. Smooth 3rd-Person Follow Camera (Desktop & VR XROrigin Tracking)
    const camDist = 7.0 + speed * 0.08
    const camHeight = 3.8 + speed * 0.03
    const camOffset = new THREE.Vector3(
      -Math.sin(heading.current) * camDist,
      camHeight,
      -Math.cos(heading.current) * camDist
    )
    const targetCamPos = position.current.clone().add(camOffset)

    if (session !== undefined) {
      // VR 3rd-Person Origin Tracking: move XR camera origin smoothly behind surfer
      xrOriginPos.current.lerp(targetCamPos, 0.12)
      if (xrOriginRef.current) {
        xrOriginRef.current.position.copy(xrOriginPos.current)
      }
    } else if (followCamera && speed > 0.2) {
      // Desktop 3rd-person follow
      camera.position.lerp(targetCamPos, 0.12)
      camera.lookAt(position.current.x, 1.0, position.current.z)
    }
  })

  return (
    <>
      {/* 3rd-Person VR Camera Origin Tracking */}
      {session !== undefined && (
        <XROrigin ref={xrOriginRef} position={[0, 3, 6]} />
      )}

      <group ref={characterGroupRef} position={[0, 0, 0]}>
        {/* Dynamic Carving SSS Light under the board */}
        <pointLight color={activeSpell.color} intensity={5.0} distance={9} decay={2} position={[0, 0.4, 0]} />

        {/* Hydro Stream Liquid Water Jet Beam */}
        {activeSpell.vfxType === 'liquid_stream' && (
          <group position={[0, 1.0, 0.5]}>
            <mesh rotation={[Math.PI / 4, 0, 0]} position={[0, -0.4, 1.2]}>
              <cylinderGeometry args={[0.08, 0.35, 3.2, 16]} />
              <meshStandardMaterial
                color="#38bdf8"
                emissive="#0284c7"
                emissiveIntensity={2.5}
                roughness={0.05}
                transparent
                opacity={0.85}
              />
            </mesh>
            <pointLight color="#38bdf8" intensity={6.0} distance={7} position={[0, -0.6, 2.2]} />
          </group>
        )}

        <group ref={boardGroupRef}>
          {/* Snow Craft Board */}
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[0.5, 0.08, 2.4]} />
            <meshStandardMaterial color="#0f172a" roughness={0.15} metalness={0.85} />
          </mesh>

          {/* Board Energy Deck Stripe */}
          <mesh position={[0, 0.15, 0]}>
            <boxGeometry args={[0.32, 0.02, 2.0]} />
            <meshStandardMaterial color={activeSpell.color} emissive={activeSpell.color} emissiveIntensity={2.5} />
          </mesh>

          {/* Third-Person Surfer Character Body */}
          <mesh position={[0, 1.1, 0]}>
            <capsuleGeometry args={[0.3, 0.8, 8, 16]} />
            <meshStandardMaterial color="#0284c7" roughness={0.3} metalness={0.4} />
          </mesh>

          {/* Character Goggles / Headpiece */}
          <mesh position={[0, 1.5, 0.2]}>
            <sphereGeometry args={[0.22, 16, 16]} />
            <meshStandardMaterial color={activeSpell.color} emissive={activeSpell.color} emissiveIntensity={2.0} />
          </mesh>
        </group>

        {/* Surfer Carving Contact Ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[activeSpell.brushRadius * 0.6, activeSpell.brushRadius * 1.1, 32]} />
          <meshBasicMaterial color={activeSpell.color} transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </>
  )
}
