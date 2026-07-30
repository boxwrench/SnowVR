export type ContextStatus = 'ok' | 'lost'

export interface ContextLossState {
  readonly status: ContextStatus
  readonly generation: number
}

export function createContextLossState(): ContextLossState {
  return { status: 'ok', generation: 0 }
}

export function markContextLost(state: ContextLossState): ContextLossState {
  if (state.status === 'lost') return state
  return { status: 'lost', generation: state.generation }
}

/**
 * The generation advances only on a genuine loss-restore cycle. Components that
 * own GPU resources use it as a React key, so a restore remounts them and their
 * render targets and textures are rebuilt by their existing memos.
 */
export function markContextRestored(state: ContextLossState): ContextLossState {
  if (state.status === 'ok') return state
  return { status: 'ok', generation: state.generation + 1 }
}
