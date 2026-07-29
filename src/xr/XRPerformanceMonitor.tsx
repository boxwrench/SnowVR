import { useFrame, useThree } from '@react-three/fiber'
import { useXR } from '@react-three/xr'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  INITIAL_PERFORMANCE_STATS,
  summarizeFrameTimes,
  type PerformanceStats,
} from './performanceStats'

interface XRPerformanceMonitorProps {
  readonly showInHeadset: boolean
  readonly onStats: (stats: PerformanceStats) => void
}

function getProjectionDimensions(
  renderer: THREE.WebGLRenderer,
  target: THREE.Vector2,
): THREE.Vector2 {
  if (!renderer.xr.isPresenting) return renderer.getDrawingBufferSize(target)

  const layer = renderer.xr.getBaseLayer()
  if (layer && 'textureWidth' in layer) {
    return target.set(layer.textureWidth, layer.textureHeight)
  }
  if (layer && 'framebufferWidth' in layer) {
    return target.set(layer.framebufferWidth, layer.framebufferHeight)
  }
  return renderer.getDrawingBufferSize(target)
}

function drawDiagnosticsPanel(canvas: HTMLCanvasElement, stats: PerformanceStats) {
  const context = canvas.getContext('2d')
  if (context === null) return

  const refresh = stats.refreshRate === undefined ? '--' : stats.refreshRate.toFixed(0)
  const foveation = stats.foveation === undefined ? '--' : stats.foveation.toFixed(2)
  const projection = stats.projectionWidth > 0
    ? `${stats.projectionWidth} x ${stats.projectionHeight}`
    : '--'

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = 'rgba(2, 12, 24, 0.94)'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.strokeStyle = '#38bdf8'
  context.lineWidth = 8
  context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8)

  context.fillStyle = '#7dd3fc'
  context.font = '700 32px ui-monospace, monospace'
  context.fillText('SNOWVR XR DEV', 30, 48)
  context.fillStyle = stats.fps >= 70 ? '#4ade80' : stats.fps >= 60 ? '#facc15' : '#fb7185'
  context.font = '800 56px ui-monospace, monospace'
  context.fillText(`${stats.fps.toFixed(0)} FPS`, 30, 112)

  context.fillStyle = '#e2e8f0'
  context.font = '600 25px ui-monospace, monospace'
  context.fillText(
    `AVG ${stats.averageFrameMs.toFixed(1)} ms   P95 ${stats.p95FrameMs.toFixed(1)} ms`,
    300,
    70,
  )
  context.fillText(`FFR ${foveation}   REFRESH ${refresh} Hz`, 300, 112)
  context.fillText(`PROJECTION ${projection}`, 300, 154)
}

function XRHeadDiagnostics({ stats }: { readonly stats: PerformanceStats }) {
  const { camera } = useThree()
  const panelRef = useRef<THREE.Mesh>(null)
  const cameraPosition = useMemo(() => new THREE.Vector3(), [])
  const cameraQuaternion = useMemo(() => new THREE.Quaternion(), [])
  const offset = useMemo(() => new THREE.Vector3(), [])
  const canvas = useMemo(() => {
    const element = document.createElement('canvas')
    element.width = 1024
    element.height = 192
    return element
  }, [])
  const texture = useMemo(() => {
    const result = new THREE.CanvasTexture(canvas)
    result.colorSpace = THREE.SRGBColorSpace
    result.generateMipmaps = false
    result.minFilter = THREE.LinearFilter
    return result
  }, [canvas])

  useEffect(() => {
    drawDiagnosticsPanel(canvas, stats)
    texture.needsUpdate = true
  }, [canvas, stats, texture])

  useEffect(() => () => texture.dispose(), [texture])

  useFrame(() => {
    if (panelRef.current === null) return
    camera.getWorldPosition(cameraPosition)
    camera.getWorldQuaternion(cameraQuaternion)
    offset.set(0, -0.28, -1.25).applyQuaternion(cameraQuaternion)
    panelRef.current.position.copy(cameraPosition).add(offset)
    panelRef.current.quaternion.copy(cameraQuaternion)
  })

  return (
    <mesh ref={panelRef} frustumCulled={false} renderOrder={9500}>
      <planeGeometry args={[1.3, 0.244]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

export function XRPerformanceMonitor({
  showInHeadset,
  onStats,
}: XRPerformanceMonitorProps) {
  const { gl } = useThree()
  const session = useXR((state) => state.session)
  const [stats, setStats] = useState<PerformanceStats>(INITIAL_PERFORMANCE_STATS)
  const frameTimes = useRef<number[]>([])
  const reportElapsed = useRef(0)
  const projectionSize = useMemo(() => new THREE.Vector2(), [])

  useFrame((_, delta) => {
    frameTimes.current.push(Math.min(delta, 0.1) * 1000)
    reportElapsed.current += delta
    if (reportElapsed.current < 0.5) return

    const timing = summarizeFrameTimes(frameTimes.current)
    getProjectionDimensions(gl, projectionSize)
    const nextStats: PerformanceStats = {
      ...timing,
      foveation: gl.xr.getFoveation(),
      refreshRate: session?.frameRate,
      projectionWidth: Math.round(projectionSize.x),
      projectionHeight: Math.round(projectionSize.y),
      isPresenting: gl.xr.isPresenting,
    }
    frameTimes.current = []
    reportElapsed.current = 0
    setStats(nextStats)
    onStats(nextStats)
  })

  return showInHeadset && session !== undefined
    ? <XRHeadDiagnostics stats={stats} />
    : null
}
