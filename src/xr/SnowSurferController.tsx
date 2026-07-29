import { useFrame, useThree } from '@react-three/fiber'
import { useXR, useXRInputSourceState, XROrigin } from '@react-three/xr'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { AVAILABLE_SPELLS, type SpellEffect } from '../experiments/SpellManager'
import type { BrushState } from '../snow/SnowTerrain'
import type { RideableDeformationField } from '../snow/RideableDeformationField'
import { TERRAIN_HALF_SIZE } from '../snow/terrainMath'
import {
  createMovementKeyState,
  resetMovementKeys,
  sampleQuestInput,
  shouldEmitTelemetry,
  updateMovementKey,
  type SurferTelemetry,
} from './inputState'
import {
  createLoopTransitionState,
  rebaseLoopCoordinate,
  stepLoopTransition,
} from './loopTransition'
import { getXrChaseYaw } from './chaseCamera'
import { resolveTerrainAim } from './terrainAim'
import {
  applySlopeGravity,
  getIceBoostFactor,
  getSurfaceFriction,
  getSurfaceMaxSpeed,
} from './surfacePhysics'

interface SnowSurferControllerProps {
  readonly activeSpell: SpellEffect
  readonly onSelectSpell?: (spell: SpellEffect) => void
  readonly brushRef: React.RefObject<BrushState>
  readonly followCamera?: boolean
  readonly desktopCasting?: boolean
  readonly onVrCastingChange?: (casting: boolean) => void
  readonly onTelemetry?: (telemetry: SurferTelemetry) => void
  readonly riderPositionRef: React.RefObject<THREE.Vector3>
  readonly deformationField: RideableDeformationField
}

export function SnowSurferController({
  activeSpell,
  onSelectSpell,
  brushRef,
  followCamera = true,
  desktopCasting = false,
  onVrCastingChange,
  onTelemetry,
  riderPositionRef,
  deformationField,
}: SnowSurferControllerProps) {
  const { camera, pointer, raycaster } = useThree()
  const session = useXR((state) => state.session)

  // XR Controller inputs
  const leftController = useXRInputSourceState('controller', 'left')
  const rightController = useXRInputSourceState('controller', 'right')

  // Character Physics State
  const position = useRef<THREE.Vector3>(
    new THREE.Vector3(0, deformationField.getHeight(0, 0) + 0.1, 0),
  )
  const velocity = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0))
  const heading = useRef<number>(0) // Yaw angle in radians
  const bankRoll = useRef<number>(0) // Roll angle for turning lean
  const loopTransition = useRef(createLoopTransitionState())
  const terrainNormal = useRef(new THREE.Vector3(0, 1, 0))
  const iceTravelDirection = useRef(new THREE.Vector3(0, 0, 1))

  // Aiming Target Position
  const aimTargetPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0))
  const castOrigin = useRef(new THREE.Vector3())
  const controllerDirection = useRef(new THREE.Vector3())

  // VR 3rd-Person Origin Tracking
  const xrOriginPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 5, 8))
  const xrOriginYaw = useRef<number>(getXrChaseYaw(0))

  // Last spell change timestamp for button debouncing
  const lastSpellChangeTime = useRef<number>(0)
  const lastHapticTime = useRef<number>(0)
  const lastVrCasting = useRef(false)
  const lastTelemetry = useRef<SurferTelemetry | undefined>(undefined)
  const lastTelemetryTime = useRef(0)

  // Desktop Key States
  const keys = useRef(createMovementKeyState())

  const characterGroupRef = useRef<THREE.Group>(null)
  const boardGroupRef = useRef<THREE.Group>(null)
  const xrOriginRef = useRef<THREE.Group>(null)
  const aimReticleRef = useRef<THREE.Group>(null)
  const transitionVeilRef = useRef<THREE.Mesh>(null)
  const transitionVeilMaterialRef = useRef<THREE.MeshBasicMaterial>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      updateMovementKey(keys.current, e.key, true)
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      updateMovementKey(keys.current, e.key, false)
    }
    const resetInput = () => resetMovementKeys(keys.current)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') resetInput()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', resetInput)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', resetInput)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    if (session !== undefined) return
    lastVrCasting.current = false
    onVrCastingChange?.(false)
  }, [onVrCastingChange, session])

  useEffect(() => () => onVrCastingChange?.(false), [onVrCastingChange])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)

    // ─── 1. XR CONTROLLER INPUT SAMPLING ───
    let turnInput = 0
    let forwardInput = 0
    let boostInput = keys.current.boost
    const leftGamepad = leftController?.inputSource?.gamepad as Gamepad | undefined
    const rightGamepad = rightController?.inputSource?.gamepad as Gamepad | undefined
    const questInput = sampleQuestInput(leftGamepad, rightGamepad)
    turnInput = questInput.turn
    forwardInput = questInput.forward
    boostInput ||= questInput.boost

    const now = performance.now()
    if (questInput.cycleSpell && now - lastSpellChangeTime.current > 350) {
      lastSpellChangeTime.current = now
      const currentIndex = AVAILABLE_SPELLS.findIndex((s) => s.id === activeSpell.id)
      const nextIndex = (currentIndex + 1) % AVAILABLE_SPELLS.length
      onSelectSpell?.(AVAILABLE_SPELLS[nextIndex])
    }

    // Combine desktop & VR steering
    if (keys.current.left) turnInput = 1.0
    if (keys.current.right) turnInput = -1.0
    if (keys.current.forward) forwardInput = 1.0
    if (keys.current.backward) forwardInput = -0.5

    if (questInput.casting !== lastVrCasting.current) {
      lastVrCasting.current = questInput.casting
      onVrCastingChange?.(questInput.casting)
    }
    const activeSpellCasting = desktopCasting || questInput.casting

    // ─── 2. DELTA-TIME EXPONENTIAL DAMPING PHYSICS ───
    deformationField.getNormal(
      position.current.x,
      position.current.z,
      terrainNormal.current,
    )
    const iceBoostFactor = getIceBoostFactor(
      deformationField.getIce(position.current.x, position.current.z),
    )
    const wetness = deformationField.getWetness(position.current.x, position.current.z)
    const turnSpeed = 3.0 * dt
    const maxSpeed = getSurfaceMaxSpeed(boostInput, iceBoostFactor)
    const accelRate = (boostInput ? 40.0 : 25.0) * dt
    const frictionFactor = Math.exp(-getSurfaceFriction(iceBoostFactor, wetness) * dt)

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

    if (iceBoostFactor > 0) {
      if (velocity.current.lengthSq() > 0.09) {
        iceTravelDirection.current.copy(velocity.current).normalize()
      } else {
        iceTravelDirection.current.copy(moveDir)
      }
      velocity.current.addScaledVector(
        iceTravelDirection.current,
        18 * iceBoostFactor * dt,
      )
    }

    velocity.current.multiplyScalar(frictionFactor)
    applySlopeGravity(velocity.current, terrainNormal.current, dt)
    if (velocity.current.length() > maxSpeed) {
      velocity.current.setLength(maxSpeed)
    }

    position.current.addScaledVector(velocity.current, dt)
    position.current.x = THREE.MathUtils.clamp(position.current.x, -56, 56)

    // Mask the endless-run coordinate rebase before it happens.
    const transition = stepLoopTransition(loopTransition.current, dt, position.current.z)
    loopTransition.current = transition.state
    if (transition.shouldRebase) {
      position.current.z = rebaseLoopCoordinate(position.current.z)
      if (session !== undefined) {
        xrOriginPos.current.z = rebaseLoopCoordinate(xrOriginPos.current.z)
        if (xrOriginRef.current) {
          xrOriginRef.current.position.z = rebaseLoopCoordinate(xrOriginRef.current.position.z)
        }
      } else {
        camera.position.z = rebaseLoopCoordinate(camera.position.z)
      }
    }
    if (transitionVeilMaterialRef.current) {
      transitionVeilMaterialRef.current.opacity = transition.opacity
    }
    if (transitionVeilRef.current) {
      transitionVeilRef.current.visible = transition.opacity > 0
      camera.getWorldPosition(transitionVeilRef.current.position)
    }

    // Ground position Y to terrain elevation
    const terrainY = deformationField.getHeight(position.current.x, position.current.z)
    position.current.y = terrainY + 0.1
    riderPositionRef.current?.copy(position.current)

    // Orient the surfer to the base terrain plus rideable spell deformation.
    const terrainNormalVec = deformationField.getNormal(
      position.current.x,
      position.current.z,
      terrainNormal.current,
    )

    const speed = velocity.current.length()
    const carvingIntensity = speed > 0.5
      ? THREE.MathUtils.clamp((speed / 34) * (0.35 + Math.abs(bankRoll.current) * 1.75), 0, 1)
      : 0
    const telemetry: SurferTelemetry = {
      speed,
      carvingIntensity,
      isCasting: activeSpellCasting,
    }
    if (shouldEmitTelemetry(lastTelemetry.current, telemetry, now, lastTelemetryTime.current)) {
      lastTelemetry.current = telemetry
      lastTelemetryTime.current = now
      onTelemetry?.(telemetry)
    }

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
      castOrigin.current.copy(position.current).addScaledVector(terrainNormalVec, 1.25)
      rightController.object.getWorldDirection(controllerDirection.current).negate()
      resolveTerrainAim(
        castOrigin.current,
        controllerDirection.current,
        moveDir,
        deformationField.getHeight,
        aimTargetPos.current,
        { terrainHalfSize: TERRAIN_HALF_SIZE },
      )
    } else {
      raycaster.setFromCamera(pointer, camera)
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -position.current.y)
      const hit = new THREE.Vector3()
      if (raycaster.ray.intersectPlane(plane, hit)) {
        aimTargetPos.current.copy(hit)
        aimTargetPos.current.y = deformationField.getHeight(hit.x, hit.z) + 0.05
      } else {
        aimTargetPos.current.copy(position.current).addScaledVector(moveDir, 6.0)
        aimTargetPos.current.y = deformationField.getHeight(
          aimTargetPos.current.x,
          aimTargetPos.current.z,
        ) + 0.05
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
        brushRef.current.affectsRide = true

        // Trigger VR Controller Haptics while casting
        if (rightGamepad && now - lastHapticTime.current >= 60) {
          const actuators = rightGamepad.hapticActuators
          if (actuators?.[0]) {
            lastHapticTime.current = now
            void actuators[0].pulse(0.35, 35)
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
        brushRef.current.affectsRide = false
      } else {
        brushRef.current.depth = 0
        brushRef.current.berm = 0
        brushRef.current.ice = 0
        brushRef.current.wetness = 0
        brushRef.current.affectsRide = false
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
      const targetXrYaw = getXrChaseYaw(heading.current)
      xrOriginYaw.current += (targetXrYaw - xrOriginYaw.current) * camDamp
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
        <XROrigin
          ref={xrOriginRef}
          position={[0, 3, 6]}
          rotation={[0, getXrChaseYaw(0), 0]}
        />
      )}

      {/* Camera-following whiteout masks the instant terrain-loop rebase in desktop and XR. */}
      <mesh
        ref={transitionVeilRef}
        frustumCulled={false}
        renderOrder={10000}
        visible={false}
      >
        <sphereGeometry args={[0.35, 16, 12]} />
        <meshBasicMaterial
          ref={transitionVeilMaterialRef}
          color="#dff5ff"
          side={THREE.BackSide}
          transparent
          opacity={0}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

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
