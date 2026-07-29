import { describe, expect, it } from 'vitest'
import { AVAILABLE_SPELLS } from './SpellManager'

describe('available spells', () => {
  it('exposes four contiguous desktop bindings without Snow Carver', () => {
    expect(AVAILABLE_SPELLS.map((spell) => spell.key)).toEqual(['1', '2', '3', '4'])
    expect(AVAILABLE_SPELLS.some((spell) => spell.id === 'snow-surf')).toBe(false)
  })

  it('defines Glacier Trail as flat ride-boosting ice', () => {
    const glacierTrail = AVAILABLE_SPELLS.find((spell) => spell.id === 'glacier-trail')

    expect(glacierTrail).toMatchObject({
      brushRadius: 2.8,
      brushDepth: 0,
      brushBerm: 0,
      brushIce: 1,
      vfxType: 'frost',
    })
    expect(glacierTrail?.vfxIntensity).toBeLessThan(0.3)
  })

  it('defines Hydro Stream as a wide wet halfpipe brush', () => {
    const hydroStream = AVAILABLE_SPELLS.find((spell) => spell.id === 'hydro-stream')

    expect(hydroStream).toMatchObject({
      brushRadius: 2.4,
      brushDepth: 1.8,
      brushBerm: 1.2,
      brushWetness: 1,
    })
  })
})
