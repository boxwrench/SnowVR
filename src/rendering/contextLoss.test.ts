import { describe, expect, it } from 'vitest'
import {
  createContextLossState,
  markContextLost,
  markContextRestored,
} from './contextLoss'

describe('WebGL context loss state', () => {
  it('starts healthy at generation zero', () => {
    const state = createContextLossState()
    expect(state.status).toBe('ok')
    expect(state.generation).toBe(0)
  })

  it('records loss without bumping the generation', () => {
    const lost = markContextLost(createContextLossState())
    expect(lost.status).toBe('lost')
    expect(lost.generation).toBe(0)
  })

  it('bumps the generation on restore so GPU resources remount', () => {
    const restored = markContextRestored(markContextLost(createContextLossState()))
    expect(restored.status).toBe('ok')
    expect(restored.generation).toBe(1)
  })

  it('is idempotent across repeated loss events', () => {
    let state = markContextLost(createContextLossState())
    state = markContextLost(state)
    state = markContextLost(state)

    expect(state.status).toBe('lost')
    expect(state.generation).toBe(0)
  })

  it('counts each loss-restore cycle exactly once', () => {
    let state = createContextLossState()
    for (let cycle = 1; cycle <= 3; cycle += 1) {
      state = markContextRestored(markContextLost(state))
      expect(state.generation).toBe(cycle)
    }
  })

  it('ignores a restore that was not preceded by a loss', () => {
    const state = markContextRestored(createContextLossState())
    expect(state.status).toBe('ok')
    expect(state.generation).toBe(0)
  })
})
