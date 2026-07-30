import * as THREE from 'three'

/**
 * Single source of truth for sky, fog, sun, and backdrop framing.
 *
 * The snow terrain, the distant mountain ring, and the scene fog previously
 * carried three unrelated horizon colours, so the terrain never blended into
 * the sky. Every consumer now reads these values.
 */

/** Colour the terrain fogs into, and the base colour of the mountain ring. */
export const HORIZON_COLOR = '#9fc4dc'
/** Sunlit snow on the distant peaks. */
export const PEAK_COLOR = '#e8f2fa'
export const SUN_COLOR = '#fff0d6'
export const DEEP_ICE_COLOR = '#024773'
export const ROCK_COLOR = '#2d3138'

export const SUN_POSITION: readonly [number, number, number] = [30, 50, 40]

/** Linear fog range, in metres, shared by every fogged material. */
export const FOG_NEAR = 30
export const FOG_FAR = 92

export const MOUNTAIN_RING_RADIUS = 180
export const MOUNTAIN_RING_HEIGHT = 70
export const MOUNTAIN_BASE_Y = -12

/** Writes the normalized sun direction into `target` and returns it. */
export function getSunDirection(target: THREE.Vector3): THREE.Vector3 {
  return target
    .set(SUN_POSITION[0], SUN_POSITION[1], SUN_POSITION[2])
    .normalize()
}
