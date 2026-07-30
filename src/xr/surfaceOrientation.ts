import * as THREE from 'three'

const UP_AXIS = new THREE.Vector3(0, 1, 0)

// Module-scope scratch. JavaScript is single-threaded and these never escape the
// call, so reusing them keeps the render loop allocation-free.
const surfaceQuat = new THREE.Quaternion()
const yawQuat = new THREE.Quaternion()

/**
 * Combines rider heading with the surface normal so the board yaws about world
 * up while its deck lies flat on the terrain.
 *
 * Writes into `target` and returns it.
 */
export function orientToSurface(
  heading: number,
  surfaceNormal: THREE.Vector3,
  target: THREE.Quaternion,
): THREE.Quaternion {
  surfaceQuat.setFromUnitVectors(UP_AXIS, surfaceNormal)
  yawQuat.setFromAxisAngle(UP_AXIS, heading)
  return target.copy(yawQuat.multiply(surfaceQuat))
}
