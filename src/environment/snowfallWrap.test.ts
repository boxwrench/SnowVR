import { describe, expect, it } from 'vitest'
import { wrapAxis } from './snowfallWrap'

describe('toroidal snowfall wrapping', () => {
  it('leaves a value inside the window untouched', () => {
    expect(wrapAxis(3, 0, 10)).toBe(3)
    expect(wrapAxis(-9.5, 0, 10)).toBe(-9.5)
  })

  it('wraps a value past the far edge back to the near edge', () => {
    expect(wrapAxis(10.5, 0, 10)).toBeCloseTo(-9.5)
  })

  it('wraps a value past the near edge back to the far edge', () => {
    expect(wrapAxis(-10.5, 0, 10)).toBeCloseTo(9.5)
  })

  it('tracks a moving center', () => {
    expect(wrapAxis(41, 50, 10)).toBeCloseTo(41)
    expect(wrapAxis(39, 50, 10)).toBeCloseTo(59)
  })

  it('wraps values many windows away in a single call', () => {
    expect(wrapAxis(105, 0, 10)).toBeCloseTo(5)
    expect(wrapAxis(-105, 0, 10)).toBeCloseTo(-5)
  })

  it('collapses to the center for a degenerate window', () => {
    expect(wrapAxis(42, 7, 0)).toBe(7)
  })
})
