/**
 * Seconds to keep simulating after the last brush stamp.
 *
 * Slump diffusion, wind infill, and drying continue to visibly change the
 * surface for several seconds after a trench is cut. Freezing the field
 * immediately would stop a fresh trench mid-relaxation in view of the rider.
 */
export const DEFORMATION_SETTLE_SECONDS = 8

export interface DeformationActivityState {
  readonly settleRemaining: number
}

export interface DeformationActivityStep {
  readonly state: DeformationActivityState
  readonly shouldSimulate: boolean
}

export function createDeformationActivityState(): DeformationActivityState {
  return { settleRemaining: 0 }
}

/**
 * Gates the deformation simulation pass. Mirrors the GPGPU particle system's
 * idle suspension so a parked scene costs nothing on the GPU.
 */
export function stepDeformationActivity(
  state: DeformationActivityState,
  deltaTime: number,
  hasBrushInput: boolean,
): DeformationActivityStep {
  if (hasBrushInput) {
    return {
      state: { settleRemaining: DEFORMATION_SETTLE_SECONDS },
      shouldSimulate: true,
    }
  }

  const settleRemaining = Math.max(0, state.settleRemaining - Math.max(0, deltaTime))
  return {
    state: { settleRemaining },
    shouldSimulate: settleRemaining > 0,
  }
}
