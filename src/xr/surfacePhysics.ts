import * as THREE from 'three'

export const NORMAL_MAX_SPEED = 16
export const MANUAL_BOOST_MAX_SPEED = 28
export const ICE_TRAIL_MAX_SPEED = 34
export const TERRAIN_GRAVITY = 14

export function getIceBoostFactor(ice: number): number {
  return THREE.MathUtils.smoothstep(ice, 0.15, 0.75)
}

export function getSurfaceMaxSpeed(manualBoost: boolean, iceBoostFactor: number): number {
  const inputLimit = manualBoost ? MANUAL_BOOST_MAX_SPEED : NORMAL_MAX_SPEED
  const iceLimit = THREE.MathUtils.lerp(NORMAL_MAX_SPEED, ICE_TRAIL_MAX_SPEED, iceBoostFactor)
  return Math.max(inputLimit, iceLimit)
}

export function getSurfaceFriction(iceBoostFactor: number, wetness: number): number {
  const snowToIce = THREE.MathUtils.lerp(2.2, 0.4, iceBoostFactor)
  return Math.max(0.3, snowToIce + THREE.MathUtils.clamp(wetness, 0, 1) * 1.5)
}

export function applySlopeGravity(
  velocity: THREE.Vector3,
  terrainNormal: THREE.Vector3,
  deltaTime: number,
): void {
  const scale = TERRAIN_GRAVITY * terrainNormal.y * deltaTime
  velocity.x += terrainNormal.x * scale
  velocity.z += terrainNormal.z * scale
}
