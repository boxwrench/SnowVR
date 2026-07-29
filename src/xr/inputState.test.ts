import { describe, expect, it } from 'vitest'
import {
  createMovementKeyState,
  resetMovementKeys,
  sampleQuestInput,
  shouldEmitTelemetry,
  updateCastingKeys,
  updateMovementKey,
  type SurferTelemetry,
} from './inputState'

const button = (pressed = false) => ({ pressed })

describe('desktop input state', () => {
  it('keeps casting active until every casting key is released', () => {
    const keys = new Set<string>()
    expect(updateCastingKeys(keys, 'Shift', true)).toBe(true)
    expect(updateCastingKeys(keys, 'e', true)).toBe(true)
    expect(updateCastingKeys(keys, 'Shift', false)).toBe(true)
    expect(updateCastingKeys(keys, 'e', false)).toBe(false)
  })

  it('updates and resets movement keys', () => {
    const state = createMovementKeyState()
    updateMovementKey(state, 'w', true)
    updateMovementKey(state, 'ArrowLeft', true)
    updateMovementKey(state, ' ', true)
    expect(state).toMatchObject({ forward: true, left: true, boost: true })
    resetMovementKeys(state)
    expect(state).toEqual(createMovementKeyState())
  })
})

describe('Quest input mapping', () => {
  it('maps left trigger or grip to boost and right trigger to casting', () => {
    const left = { axes: [0, 0, 0.5, -0.75], buttons: [button(true), button(false)] }
    const right = { axes: [], buttons: [button(true)] }
    expect(sampleQuestInput(left, right)).toMatchObject({
      turn: -0.5,
      forward: 0.75,
      boost: true,
      casting: true,
    })

    right.buttons[0] = button(false)
    expect(sampleQuestInput(left, right).casting).toBe(false)
  })

  it('cycles spells from either face button', () => {
    const right = { axes: [], buttons: [button(), button(), button(), button(), button(true), button()] }
    expect(sampleQuestInput(undefined, right).cycleSpell).toBe(true)
  })
})

describe('telemetry emission', () => {
  const idle: SurferTelemetry = { speed: 4, carvingIntensity: 0.2, isCasting: false }

  it('emits immediately on casting edges and otherwise throttles updates', () => {
    expect(shouldEmitTelemetry(undefined, idle, 0, 0)).toBe(true)
    expect(shouldEmitTelemetry(idle, { ...idle, speed: 5 }, 50, 0)).toBe(false)
    expect(shouldEmitTelemetry(idle, { ...idle, isCasting: true }, 50, 0)).toBe(true)
    expect(shouldEmitTelemetry(idle, { ...idle, speed: 5 }, 100, 0)).toBe(true)
  })
})
