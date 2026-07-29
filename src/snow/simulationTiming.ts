export const REFERENCE_REFRESH_RATE = 72

export function getReferenceFrameScale(deltaTime: number): number {
  return Math.max(0, Math.min(deltaTime, 0.05)) * REFERENCE_REFRESH_RATE
}

export function referenceProbabilityToFrameProbability(
  referenceFrameProbability: number,
  deltaTime: number,
): number {
  const probability = Math.max(0, Math.min(1, referenceFrameProbability))
  return 1 - Math.pow(1 - probability, getReferenceFrameScale(deltaTime))
}
