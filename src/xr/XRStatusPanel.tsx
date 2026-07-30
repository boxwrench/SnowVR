import { useFrame } from '@react-three/fiber'
import { useXR } from '@react-three/xr'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { SpellEffect } from '../experiments/SpellManager'

interface XRStatusPanelProps {
  readonly activeSpell: SpellEffect
  readonly speed: number
  readonly isCasting: boolean
  readonly riderPositionRef: React.RefObject<THREE.Vector3>
}

function drawStatusPanel(
  canvas: HTMLCanvasElement,
  activeSpell: SpellEffect,
  speed: number,
  isCasting: boolean,
) {
  const context = canvas.getContext('2d')
  if (context === null) return

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = 'rgba(7, 20, 36, 0.9)'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.strokeStyle = activeSpell.color
  context.lineWidth = 10
  context.strokeRect(5, 5, canvas.width - 10, canvas.height - 10)

  context.fillStyle = '#8bdcff'
  context.font = '600 28px system-ui, sans-serif'
  context.fillText('ACTIVE SPELL', 34, 50)
  context.fillStyle = '#ffffff'
  context.font = '700 50px system-ui, sans-serif'
  context.fillText(activeSpell.name.toUpperCase(), 34, 108)

  context.fillStyle = '#a9c5d8'
  context.font = '600 27px system-ui, sans-serif'
  context.fillText(`SPEED  ${speed.toFixed(1)} m/s`, 34, 158)

  context.fillStyle = isCasting ? activeSpell.color : 'rgba(100, 116, 139, 0.5)'
  context.fillRect(490, 42, 240, 116)
  context.fillStyle = isCasting ? '#071424' : '#d7e4ec'
  context.font = '800 42px system-ui, sans-serif'
  context.textAlign = 'center'
  context.fillText(isCasting ? 'CAST' : 'READY', 610, 112)
  context.textAlign = 'start'
}

export function XRStatusPanel({
  activeSpell,
  speed,
  isCasting,
  riderPositionRef,
}: XRStatusPanelProps) {
  const session = useXR((state) => state.session)
  const spriteRef = useRef<THREE.Sprite>(null)
  const canvas = useMemo(() => {
    const element = document.createElement('canvas')
    element.width = 768
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
    drawStatusPanel(canvas, activeSpell, speed, isCasting)
    texture.needsUpdate = true
  }, [activeSpell, canvas, isCasting, speed, texture])

  useEffect(() => () => texture.dispose(), [texture])

  useFrame(() => {
    if (spriteRef.current === null || riderPositionRef.current === null) return
    // Kept low and well off to the side. At +2.5 up and +1.45 across this
    // billboard sat directly in the forward sightline, and depthTest is off so
    // it drew over the snowfield rather than being occluded by it.
    spriteRef.current.position.copy(riderPositionRef.current)
    spriteRef.current.position.x += 2.6
    spriteRef.current.position.y += 0.9
  })

  if (session === undefined) return null

  return (
    <sprite ref={spriteRef} scale={[2.0, 0.5, 1]} renderOrder={9000}>
      <spriteMaterial
        map={texture}
        transparent
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  )
}
