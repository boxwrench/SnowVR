import { useFrame, useThree } from '@react-three/fiber'
import { useXR, useXRInputSourceState, XROrigin } from '@react-three/xr'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { AVAILABLE_SPELLS, type SpellEffect } from '../experiments/SpellManager'
import type { BrushState } from '../snow/SnowTerrain'
import { getTerrainHeight, getTerrainNormal } from '../snow/terrainMath'

interface SnowSurferControllerProps {
  readonly activeSpell: SpellEffect
  readonly onSelectSpell?: (spell: SpellEffect) => void
  readonly brushRef: React.RefObject<BrushState>
  readonly followCamera?: boolean
  readonly isMouseDown?: boolean
  readonly isCasting?: boolean
  readonly setIsCasting?: (casting: boolean) => void
}

export function SnowSurferController({
  activeSpell,
  onSelectSpell,
  brushRef,
  followCamera = true,
  isMouseDown = false,
  isCasting = false,
  setIsCasting,
}: SnowSurferControllerProps) {
  const { camera, pointer, raycaster } = useThree()
  const session = useXR((state) => state.session)

  // XR Controller inputs
  const leftController = useXRInputSourceState('controller', 'left')
  const rightController = useXRInputSourceState('controller', 'right')

  // Character Physics State
  const position = useRef<THREE.Vector3>(new THREE.Vector3(0, getTerrainHeight(0, 0) + 0.1, 0))
  const velocity = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0))
  const heading = useRef<number>(0) // Yaw angle in radians
  const bankRoll = useRef<number>(0) // Roll angle for turning lean

  // Aiming Target Position
  const aimTargetPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0))

  // VR 3rd-Person Origin Tracking
  const xrOriginPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 5, 8))
  const xrOriginYaw = useRef<number>(0)

  // Last spell change timestamp for button debouncing
  const lastSpellChangeTime = useRef<number>(0)

  // Desktop Key States
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
    const dt = Math.min(delta, 0.05)

    // ─── 1. XR CONTROLLER INPUT SAMPLING ───
    let turnInput = 0
    let forwardInput = 0
    let boostInput = keys.current.boost
    let vrCastingInput = false

    const leftGamepad = leftController?.inputSource?.gamepad as Gamepad | undefined
    const rightGamepad = rightController?.inputSource?.gamepad as Gamepad | undefined

    if (leftGamepad) {
      const axes = leftGamepad.axes
      const buttons = leftGamepad.buttons

      const axisX = axes.length > 2 && Math.abs(axes[2]) > 0.1 ? axes[2] : axes[0] ?? 0
      const axisY = axes.length > 3 && Math.abs(axes[3]) > 0.1 ? axes[3] : axes[1] ?? 0

      if (Math.abs(axisX) > 0.15) turnInput = -axisX
      if (Math.abs(axisY) > 0.15) forwardInput = -axisY

      if (buttons[1]?.pressed || buttons[3]?.pressed) boostInput = true
    }

    if (rightGamepad) {
      const buttons = rightGamepad.buttons

      if (buttons[0]?.pressed) {
        vrCastingInput = true
      }

      const now = performance.now()
      if ((buttons[4]?.pressed || buttons[5]?.pressed) && now - lastSpellChangeTime.current > 350) {
        lastSpellChangeTime.current = now
        const currentIndex = AVAILABLE_SPELLS.findIndex((s) => s.id === activeSpell.id)
        const nextIndex = (currentIndex + 1) % AVAILABLE_SPELLS.length
        onSelectSpell?.(AVAILABLE_SPELLS[nextIndex])
      }
    }

    // Combine desktop & VR steering
    if (keys.current.left) turnInput = 1.0
    if (keys.current.right) turnInput = -1.0
    if (keys.current.forward) forwardInput = 1.0
    if (keys.current.backward) forwardInput = -0.5

    const activeSpellCasting = isCasting || isMouseDown || vrCastingInput
    if (setIsCasting && activeSpellCasting !== isCasting) {
      setIsCasting(activeSpellCasting)
    }

    // ─── 2. DELTA-TIME EXPONENTIAL DAMPING PHYSICS ───
    const turnSpeed = 3.0 * dt
    const maxSpeed = boostInput ? 28.0 : 16.0
    const accelRate = (boostInput ? 40.0 : 25.0) * dt
    const frictionFactor = Math.exp(-2.2 * dt)

    heading.current += turnInput * turnSpeed
    const targetBank = turnInput * -0.4

    const bankDamp = 1.0 - Math.exp(-12.0 * dt)
    bankRoll.current += (targetBank - bankRoll.current) * bankDamp

    const moveDir = new THREE.Vector3(
      Math.sin(heading.current),
      0,
      Math.cos(heading.current)
    )

    if (forwardInput !== 0) {
      velocity.current.addScaledVector(moveDir, accelRate * forwardInput)
    }

    velocity.current.multiplyScalar(frictionFactor)
    if (velocity.current.length() > maxSpeed) {
      velocity.current.setLength(maxSpeed)
    }

    // Downhill gravity assistance along +Z axis
    velocity.current.z += 1.8 * dt

    position.current.addScaledVector(velocity.current, dt)
    position.current.x = THREE.MathUtils.clamp(position.current.x, -56, 56)

    // Continuous Endless Downhill Loop
    if (position.current.z > 50) {
      position.current.z -= 80
    }

    // Ground position Y to terrain elevation
    const terrainY = getTerrainHeight(position.current.x, position.current.z)
    position.current.y = terrainY + 0.1

    // Orient surfer with terrain slope normal
    const normal = getTerrainNormal(position.current.x, position.current.z)
    const terrainNormalVec = new THREE.Vector3(normal.nx, normal.ny, normal.nz)

    const speed = velocity.current.length()

    // ─── 3. CHARACTER MESH PLACEMENT & LEANING ───
    if (characterGroupRef.current) {
      characterGroupRef.current.position.copy(position.current)

      const up = terrainNormalVec.clone()
      const quat = new THREE.Quaternion()
      quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up)

      const yawQuat = new THREE.Quaternion()
      yawQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), heading.current)

      characterGroupRef.current.quaternion.copy(yawQuat.multiply(quat))
    }

    if (boardGroupRef.current) {
      boardGroupRef.current.rotation.z = bankRoll.current
    }

    // ─── 4. INDEPENDENT SPELL AIMING & RAY CASTING ───
    if (session !== undefined && rightController?.object) {
      const rayOrigin = new THREE.Vector3()
      const rayDirection = new THREE.Vector3(0, 0, -1)
      rightController.object.getWorldPosition(rayOrigin)
      rightController.object.getWorldDirection(rayDirection)
      rayDirection.negate()

      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -position.current.y)
      const hit = new THREE.Vector3()
      const ray = new THREE.Ray(rayOrigin, rayDirection)
      if (ray.intersectPlane(plane, hit)) {
        aimTargetPos.current.copy(hit)
        aimTargetPos.current.y = getTerrainHeight(hit.x, hit.z) + 0.05
      }
    } else {
      raycaster.setFromCamera(pointer, camera)
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -position.current.y)
      const hit = new THREE.Vector3()
      if (raycaster.ray.intersectPlane(plane, hit)) {
        aimTargetPos.current.copy(hit)
        aimTargetPos.current.y = getTerrainHeight(hit.x, hit.z) + 0.05
      } else {
        aimTargetPos.current.copy(position.current).addScaledVector(moveDir, 6.0)
        aimTargetPos.current.y = getTerrainHeight(aimTargetPos.current.x, aimTargetPos.current.z) + 0.05
      }
    }

    if (aimReticleRef.current) {
      aimReticleRef.current.position.copy(aimTargetPos.current)
    }

    // ─── 5. CARVING & SPELL CASTING LOGIC ───
    if (brushRef.current) {
      if (activeSpellCasting) {
        const mult = activeSpell.castMultiplier
        brushRef.current.pos.set(
          aimTargetPos.current.x,
          aimTargetPos.current.z,
          activeSpell.brushRadius * (1.0 + speed * 0.01)
        )
        brushRef.current.depth = activeSpell.brushDepth * mult
        brushRef.current.berm = activeSpell.brushBerm * mult
        brushRef.current.ice = activeSpell.brushIce * mult
        brushRef.current.wetness = activeSpell.brushWetness * mult

        // Trigger VR Controller Haptics while casting
        if (rightGamepad) {
          const actuators = rightGamepad.hapticActuators as any[]
          if (actuators && actuators[0]) {
            actuators[0].pulse(0.4, 30)
          }
        }
      } else if (speed > 0.5) {
        brushRef.current.pos.set(
          position.current.x,
          position.current.z,
          0.45 + speed * 0.015
        )
        brushRef.current.depth = 0.35 * (0.6 + speed * 0.02)
        brushRef.current.berm = 0.6 * (0.6 + Math.abs(bankRoll.current) * 2.0)
        brushRef.current.ice = 0.2
        brushRef.current.wetness = 0.0
      } else {
        brushRef.current.depth = 0
      }
    }

    // ─── 6. HORIZON-STABLE CHASE CAMERA FOLLOW ───
    const camDist = 6.5 + speed * 0.06
    const camHeight = 3.2 + speed * 0.02
    const camOffset = new THREE.Vector3(
      -Math.sin(heading.current) * camDist,
      camHeight,
      -Math.cos(heading.current) * camDist
    )
    const targetCamPos = position.current.clone().add(camOffset)

    const camDamp = 1.0 - Math.exp(-8.0 * dt)

    if (session !== undefined) {
      xrOriginPos.current.lerp(targetCamPos, camDamp)
      xrOriginYaw.current += (heading.current - xrOriginYaw.current) * camDamp
      if (xrOriginRef.current) {
        xrOriginRef.current.position.copy(xrOriginPos.current)
        xrOriginRef.current.rotation.y = xrOriginYaw.current
      }
    } else if (followCamera && speed > 0.2) {
      camera.position.lerp(targetCamPos, camDamp)
      camera.lookAt(position.current.x, position.current.y + 1.0, position.current.z)
    }
  })

  return (
    <>
      {/* 3rd-Person Horizon-Stable VR Camera Origin Tracking */}
      {session !== undefined && (
        <XROrigin ref={xrOriginRef} position={[0, 3, 6]} />
      )}

      {/* Independent Spell Aim Reticle & Targeted Caster Light */}
      <group ref={aimReticleRef} position={[0, 0.1, 0]}>
        <pointLight color={activeSpell.color} intensity={5.0} distance={8} decay={2} position={[0, 0.6, 0]} />

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
        {/* Dynamic Carving Light under the board */}
        <pointLight color={activeSpell.color} intensity={3.0} distance={6} decay={2} position={[0, 0.4, 0]} />

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
