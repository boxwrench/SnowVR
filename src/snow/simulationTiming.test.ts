import { describe, expect, it } from 'vitest'
import {
  REFERENCE_REFRESH_RATE,
  getReferenceFrameScale,
  referenceProbabilityToFrameProbability,
} from './simulationTiming'

describe('frame-independent simulation timing', () => {
  it('preserves the existing per-frame strength at 72 Hz', () => {
    expect(getReferenceFrameScale(1 / REFERENCE_REFRESH_RATE)).toBeCloseTo(1, 8)
  })

  it.each([72, 80, 90, 120])('applies equal stamp strength per second at %i Hz', (rate) => {
    expect(getReferenceFrameScale(1 / rate) * rate).toBeCloseTo(REFERENCE_REFRESH_RATE, 8)
  })

  it.each([72, 80, 90, 120])('preserves equal spawn survival over one second at %i Hz', (rate) => {
    const perFrame = referenceProbabilityToFrameProbability(0.35, 1 / rate)
    const survival = Math.pow(1 - perFrame, rate)
    expect(survival).toBeCloseTo(Math.pow(1 - 0.35, REFERENCE_REFRESH_RATE), 8)
  })
})
