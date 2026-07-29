import * as THREE from 'three'
import { getReferenceFrameScale } from './simulationTiming'
import { getTerrainHeight, TERRAIN_SIZE } from './terrainMath'

const DEFAULT_RESOLUTION = 257
const DECAY_INTERVAL = 0.1
const DEPRESSION_HEIGHT_SCALE = 1.2
const BERM_HEIGHT_SCALE = 1.8
const WET_BERM_HEIGHT_BONUS = 1.4

export interface RideableDeformationBrush {
  readonly pos: THREE.Vector3
  readonly depth: number
  readonly berm: number
  readonly ice: number
  readonly wetness: number
  readonly affectsRide: boolean
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge0 === edge1) return value < edge0 ? 0 : 1
  const amount = clamp01((value - edge0) / (edge1 - edge0))
  return amount * amount * (3 - 2 * amount)
}

/**
 * CPU collision mirror for spell-authored GPU deformation.
 *
 * Reading a half-float render target back every XR frame would synchronize the
 * CPU and GPU. Instead, this lower-cost field applies the same brush equations
 * and exposes bilinear height/material samples to rider physics.
 */
export class RideableDeformationField {
  private readonly depression: Float32Array
  private readonly berm: Float32Array
  private readonly ice: Float32Array
  private readonly wetness: Float32Array
  private decayAccumulator = 0

  public constructor(private readonly resolution = DEFAULT_RESOLUTION) {
    const length = resolution * resolution
    this.depression = new Float32Array(length)
    this.berm = new Float32Array(length)
    this.ice = new Float32Array(length)
    this.wetness = new Float32Array(length)
  }

  public update(
    deltaTime: number,
    brush: RideableDeformationBrush,
    windDecay: number,
  ): void {
    const dt = Math.max(0, Math.min(deltaTime, 0.05))
    this.decayAccumulator += dt
    if (this.decayAccumulator >= DECAY_INTERVAL) {
      this.applyDecay(this.decayAccumulator, windDecay)
      this.decayAccumulator = 0
    }

    if (!brush.affectsRide || brush.pos.z <= 0 || dt === 0) return
    this.applyBrush(brush, getReferenceFrameScale(dt))
  }

  public readonly getHeight = (x: number, z: number): number => (
    getTerrainHeight(x, z) + this.getHeightOffset(x, z)
  )

  public getHeightOffset(x: number, z: number): number {
    const depression = this.sampleChannel(this.depression, x, z)
    const berm = this.sampleChannel(this.berm, x, z)
    const wetness = this.sampleChannel(this.wetness, x, z)
    return -depression * DEPRESSION_HEIGHT_SCALE
      + berm * (BERM_HEIGHT_SCALE + wetness * WET_BERM_HEIGHT_BONUS)
  }

  public getIce(x: number, z: number): number {
    return this.sampleChannel(this.ice, x, z)
  }

  public getWetness(x: number, z: number): number {
    return this.sampleChannel(this.wetness, x, z)
  }

  public getNormal(x: number, z: number, target: THREE.Vector3): THREE.Vector3 {
    const eps = TERRAIN_SIZE / (this.resolution - 1)
    const dx = (this.getHeight(x + eps, z) - this.getHeight(x - eps, z)) / (2 * eps)
    const dz = (this.getHeight(x, z + eps) - this.getHeight(x, z - eps)) / (2 * eps)
    return target.set(-dx, 1, -dz).normalize()
  }

  private applyBrush(brush: RideableDeformationBrush, frameScale: number): void {
    const radius = brush.pos.z
    const outerRadius = brush.depth >= 0 ? radius * 1.6 : radius
    const cellsPerMetre = (this.resolution - 1) / TERRAIN_SIZE
    const centerColumn = (brush.pos.x / TERRAIN_SIZE + 0.5) * (this.resolution - 1)
    const centerRow = (0.5 - brush.pos.y / TERRAIN_SIZE) * (this.resolution - 1)
    const cellRadius = Math.ceil(outerRadius * cellsPerMetre)
    const minColumn = Math.max(0, Math.floor(centerColumn) - cellRadius)
    const maxColumn = Math.min(this.resolution - 1, Math.ceil(centerColumn) + cellRadius)
    const minRow = Math.max(0, Math.floor(centerRow) - cellRadius)
    const maxRow = Math.min(this.resolution - 1, Math.ceil(centerRow) + cellRadius)

    for (let row = minRow; row <= maxRow; row += 1) {
      const worldZ = (0.5 - row / (this.resolution - 1)) * TERRAIN_SIZE
      for (let column = minColumn; column <= maxColumn; column += 1) {
        const worldX = (column / (this.resolution - 1) - 0.5) * TERRAIN_SIZE
        const distance = Math.hypot(worldX - brush.pos.x, worldZ - brush.pos.y)
        const stamp = 1 - smoothstep(0, radius, distance)
        const bermRing = smoothstep(radius * 0.2, radius * 0.75, distance)
          * (1 - smoothstep(radius * 0.85, radius * 1.6, distance))
        if (stamp <= 0 && bermRing <= 0) continue

        const index = row * this.resolution + column
        if (brush.depth >= 0) {
          this.depression[index] = clamp01(
            this.depression[index] + stamp * brush.depth * 0.45 * frameScale,
          )
          this.berm[index] = clamp01(
            this.berm[index] + bermRing * brush.depth * brush.berm * 0.55 * frameScale,
          )
        } else {
          const buildHeight = -brush.depth
          this.berm[index] = clamp01(
            this.berm[index] + stamp * buildHeight * 0.6 * frameScale,
          )
          this.depression[index] = Math.max(
            0,
            this.depression[index] - stamp * buildHeight * 0.5 * frameScale,
          )
        }

        this.ice[index] = clamp01(
          this.ice[index] + stamp * brush.ice * 0.6 * frameScale,
        )
        this.wetness[index] = clamp01(
          this.wetness[index] + stamp * brush.wetness * 0.6 * frameScale,
        )
      }
    }
  }

  private applyDecay(deltaTime: number, windDecay: number): void {
    const bermRetention = Math.exp(-0.08 * deltaTime)
    const windDepressionDecay = Math.max(0, windDecay) * 0.04 * deltaTime
    const windBermDecay = Math.max(0, windDecay) * 0.02 * deltaTime

    for (let index = 0; index < this.depression.length; index += 1) {
      this.depression[index] = Math.max(
        0,
        this.depression[index] - (this.depression[index] * 0.15 * deltaTime)
          - windDepressionDecay,
      )
      this.berm[index] = Math.max(
        0,
        this.berm[index] * bermRetention - windBermDecay,
      )
      this.wetness[index] = Math.max(0, this.wetness[index] - deltaTime * 0.08)
    }
  }

  private sampleChannel(channel: Float32Array, x: number, z: number): number {
    const u = clamp01(x / TERRAIN_SIZE + 0.5)
    const v = clamp01(0.5 - z / TERRAIN_SIZE)
    const gridX = u * (this.resolution - 1)
    const gridY = v * (this.resolution - 1)
    const left = Math.min(Math.floor(gridX), this.resolution - 2)
    const top = Math.min(Math.floor(gridY), this.resolution - 2)
    const fractionX = gridX - left
    const fractionY = gridY - top
    const topLeft = channel[top * this.resolution + left]
    const topRight = channel[top * this.resolution + left + 1]
    const bottomLeft = channel[(top + 1) * this.resolution + left]
    const bottomRight = channel[(top + 1) * this.resolution + left + 1]
    const upper = topLeft + (topRight - topLeft) * fractionX
    const lower = bottomLeft + (bottomRight - bottomLeft) * fractionX
    return upper + (lower - upper) * fractionY
  }
}
