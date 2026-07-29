/**
 * WebXR's local forward vector is -Z, while the rider's heading zero advances
 * along +Z. Rotate the player origin half a turn to keep the rider in front.
 */
export function getXrChaseYaw(heading: number): number {
  return heading + Math.PI
}
