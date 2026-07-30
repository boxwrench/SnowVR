import { describe, expect, it } from 'vitest'
import {
  DEFORMATION_SETTLE_SECONDS,
  createDeformationActivityState,
  stepDeformationActivity,
} from './deformationActivity'

describe('deformation pass activity gate', () => {
  it('starts settled so a parked scene does not simulate', () => {
    const initial = createDeformationActivityState()
    const step = stepDeformationActivity(initial, 0.014, false)
    expect(step.shouldSimulate).toBe(false)
  })

  it('simulates while a brush is stamping', () => {
    const step = stepDeformationActivity(
      createDeformationActivityState(),
      0.014,
      true,
    )
    expect(step.shouldSimulate).toBe(true)
    expect(step.state.settleRemaining).toBeCloseTo(DEFORMATION_SETTLE_SECONDS)
  })

  it('keeps simulating through the settle window after input stops', () => {
    let step = stepDeformationActivity(
      createDeformationActivityState(),
      0.014,
      true,
    )

    let elapsed = 0
    while (elapsed < DEFORMATION_SETTLE_SECONDS - 0.5) {
      step = stepDeformationActivity(step.state, 0.1, false)
      elapsed += 0.1
      expect(step.shouldSimulate).toBe(true)
    }
  })

  it('stops simulating once the settle window expires', () => {
    let step = stepDeformationActivity(
      createDeformationActivityState(),
      0.014,
      true,
    )
    step = stepDeformationActivity(step.state, DEFORMATION_SETTLE_SECONDS + 0.1, false)

    expect(step.shouldSimulate).toBe(false)
    expect(step.state.settleRemaining).toBe(0)
  })

  it('resumes immediately when a brush returns after settling', () => {
    let step = stepDeformationActivity(
      createDeformationActivityState(),
      DEFORMATION_SETTLE_SECONDS + 1,
      false,
    )
    expect(step.shouldSimulate).toBe(false)

    step = stepDeformationActivity(step.state, 0.014, true)
    expect(step.shouldSimulate).toBe(true)
  })

  it('never accumulates negative settle time', () => {
    const step = stepDeformationActivity(
      createDeformationActivityState(),
      100,
      false,
    )
    expect(step.state.settleRemaining).toBe(0)
  })
})
