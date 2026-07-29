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
  readonly isMouseDown?: boolean
}

export function SnowSurferController({
  activeSpell,
  onBrushUpdate,
  followCamera = true,
  isMouseDown = false,
}: SnowSurferControllerProps) {
  const { camera, pointer, raycaster } = useThree()
  const session = useXR((state) => state.session)
  
  // Character Physics State
  const position = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0))
  const velocity = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0))
  const heading = useRef<number>(0) // Yaw angle in radians
  const bankRoll = useRef<number>(0) // Roll angle for turning lean

  // Independent Aiming Target Position
  const aimTargetPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0))

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
  const aimReticleRef = useRef<THREE.Group>(null)

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
      targetBank = -0.42
    }
    if (keys.current.right) {
      heading.current -= turnSpeed
      targetBank = 0.42
    }

    bankRoll.current += (targetBank - bankRoll.current) * 10.0 * delta

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

    velocity.current.multiplyScalar(friction)
    if (velocity.current.length() > maxSpeed) {
      velocity.current.setLength(maxSpeed)
    }

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

    // 3. Compute Independent Mouse/VR Raycast Aim Position on Snow Plane
    raycaster.setFromCamera(pointer, camera)
    const snowPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const rayIntersection = new THREE.Vector3()
    if (raycaster.ray.intersectPlane(snowPlane, rayIntersection)) {
      aimTargetPos.current.copy(rayIntersection)
    } else {
      // Default aim in front of surfer
      aimTargetPos.current.copy(position.current).addScaledVector(moveDir, 6.0)
    }

    if (aimReticleRef.current) {
      aimReticleRef.current.position.copy(aimTargetPos.current)
    }

    // 4. Carving & Spell Casting Logic:
    // If holding Left Click / aiming separately, cast active spell AT THE AIMED POINT on terrain!
    // Otherwise, carve the natural snowboard wake under the board.
    const activeImpactPos = (isMouseDown && activeSpell.id !== 'snow-surf')
      ? aimTargetPos.current
      : position.current

    if (speed > 0.5 || isMouseDown) {
      const mult = activeSpell.castMultiplier
      const brushVec = new THREE.Vector3(
        activeImpactPos.x,
        activeImpactPos.z,
        activeSpell.brushRadius * (1.0 + speed * 0.015)
      )
      
      onBrushUpdate(
        brushVec,
        activeSpell.brushDepth * mult * (0.6 + speed * 0.02),
        activeSpell.brushBerm * mult * (0.6 + Math.abs(bankRoll.current) * 2.0),
        activeSpell.brushIce * mult,
        activeSpell.brushWetness * mult
      )
    }

    // 5. Smooth 3rd-Person Follow Camera
    const camDist = 7.0 + speed * 0.08
    const camHeight = 3.8 + speed * 0.03
    const camOffset = new THREE.Vector3(
      -Math.sin(heading.current) * camDist,
      camHeight,
      -Math.cos(heading.current) * camDist
    )
    const targetCamPos = position.current.clone().add(camOffset)

    if (session !== undefined) {
      xrOriginPos.current.lerp(targetCamPos, 0.12)
      if (xrOriginRef.current) {
        xrOriginRef.current.position.copy(xrOriginPos.current)
      }
    } else if (followCamera && speed > 0.2) {
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

      {/* Independent Spell Aim Reticle & Targeted Caster Light */}
      <group ref={aimReticleRef} position={[0, 0.1, 0]}>
        <pointLight color={activeSpell.color} intensity={6.0} distance={10} decay={2} position={[0, 0.6, 0]} />

        {/* Aim Target Ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[activeSpell.brushRadius * 0.7, activeSpell.brushRadius * 1.3, 32]} />
          <meshBasicMaterial color={activeSpell.color} transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>

        {/* Aim Crystal Marker */}
        <mesh position={[0, 0.4, 0]}>
          <octahedronGeometry args={[0.2, 0]} />
          <meshStandardMaterial
            color={activeSpell.color}
            emissive={activeSpell.color}
            emissiveIntensity={3.0}
          />
        </mesh>
      </group>

      <group ref={characterGroupRef} position={[0, 0, 0]}>
        {/* Dynamic Carving SSS Light under the board */}
        <pointLight color={activeSpell.color} intensity={4.0} distance={8} decay={2} position={[0, 0.4, 0]} />

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
      </group>
    </>
  )
}
