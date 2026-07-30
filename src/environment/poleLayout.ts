export interface PoleInstance {
  readonly x: number
  readonly z: number
  readonly isRed: boolean
}

export const POLE_SPACING_METRES = 18
export const POLE_GATE_HALF_WIDTH = 3.5

const FIRST_GATE_Z = -40
const LAST_GATE_Z = 40
const LATERAL_WEAVE_AMPLITUDE = 6
const LATERAL_WEAVE_FREQUENCY = 0.15

/** Deterministic slalom gate layout used as the run's visual scale anchor. */
export function createPoleLayout(): readonly PoleInstance[] {
  const poles: PoleInstance[] = []

  for (let z = FIRST_GATE_Z; z <= LAST_GATE_Z; z += POLE_SPACING_METRES) {
    const weave = Math.sin(z * LATERAL_WEAVE_FREQUENCY) * LATERAL_WEAVE_AMPLITUDE
    poles.push({ x: weave - POLE_GATE_HALF_WIDTH, z, isRed: true })
    poles.push({ x: weave + POLE_GATE_HALF_WIDTH, z, isRed: false })
  }

  return poles
}
