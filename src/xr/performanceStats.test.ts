import { describe, expect, it } from 'vitest'
import { summarizeFrameTimes } from './performanceStats'

describe('render-loop performance statistics', () => {
  it('returns zeroes before any frame has been sampled', () => {
    expect(summarizeFrameTimes([])).toEqual({
      fps: 0,
      averageFrameMs: 0,
      p95FrameMs: 0,
    })
  })

  it('reports average FPS and a nearest-rank p95 frame time', () => {
    const stats = summarizeFrameTimes([10, 11, 12, 13, 40])
    expect(stats.averageFrameMs).toBeCloseTo(17.2)
    expect(stats.fps).toBeCloseTo(1000 / 17.2)
    expect(stats.p95FrameMs).toBe(40)
  })
})
