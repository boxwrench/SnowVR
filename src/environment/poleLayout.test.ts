import { describe, expect, it } from 'vitest'
import { TERRAIN_HALF_SIZE } from '../snow/terrainMath'
import {
  POLE_GATE_HALF_WIDTH,
  POLE_SPACING_METRES,
  createPoleLayout,
} from './poleLayout'

describe('slalom gate layout', () => {
  it('emits a red and a blue pole for every gate', () => {
    const poles = createPoleLayout()
    expect(poles.length).toBeGreaterThan(0)
    expect(poles.length % 2).toBe(0)
    expect(poles.filter((p) => p.isRed)).toHaveLength(poles.length / 2)
  })

  it('spaces gates evenly down the run', () => {
    const gateDepths = [...new Set(createPoleLayout().map((p) => p.z))].sort(
      (a, b) => a - b,
    )
    expect(gateDepths.length).toBeGreaterThan(1)
    for (let i = 1; i < gateDepths.length; i += 1) {
      expect(gateDepths[i] - gateDepths[i - 1]).toBeCloseTo(POLE_SPACING_METRES)
    }
  })

  it('separates each gate pair symmetrically', () => {
    const poles = createPoleLayout()
    const firstZ = poles[0].z
    const gate = poles.filter((p) => p.z === firstZ)
    expect(gate).toHaveLength(2)
    const [left, right] = gate.sort((a, b) => a.x - b.x)
    expect(right.x - left.x).toBeCloseTo(POLE_GATE_HALF_WIDTH * 2)
  })

  it('keeps every pole inside the terrain plane', () => {
    for (const pole of createPoleLayout()) {
      expect(Math.abs(pole.x)).toBeLessThan(TERRAIN_HALF_SIZE)
      expect(Math.abs(pole.z)).toBeLessThan(TERRAIN_HALF_SIZE)
    }
  })
})
