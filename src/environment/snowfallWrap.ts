/**
 * Wraps a coordinate into the window [center - halfExtent, center + halfExtent].
 *
 * Falling snow is simulated in world space around the camera. Wrapping every
 * axis keeps the volume centred on the viewer at a fixed particle budget, so
 * snowfall is present for the whole run instead of only near the origin.
 */
export function wrapAxis(value: number, center: number, halfExtent: number): number {
  const size = halfExtent * 2
  if (size <= 0) return center

  const delta = value - center
  return center + delta - Math.floor((delta + halfExtent) / size) * size
}
