import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { XR } from '@react-three/xr'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

import { Atmosphere } from './environment/Atmosphere'
import { DistantMountains } from './environment/DistantMountains'
import { FallingSnowParticles } from './environment/FallingSnowParticles'
import { GPGPUSpellParticles } from './environment/GPGPUSpellParticles'
import { SlalomPoles } from './environment/SlalomPoles'
import { SnowAudioController } from './environment/SnowAudioController'
import { AVAILABLE_SPELLS, type SpellEffect } from './experiments/SpellManager'
import { ContextLossGuard } from './rendering/ContextLossGuard'
import {
  createContextLossState,
  markContextLost,
  markContextRestored,
} from './rendering/contextLoss'
import { SnowTerrain, type BrushState } from './snow/SnowTerrain'
import { RideableDeformationField } from './snow/RideableDeformationField'
import { DevOverlay } from './ui/DevOverlay'
import { SpellBar } from './ui/SpellBar'
import { updateCastingKeys, type SurferTelemetry } from './xr/inputState'
import { publishPerformanceStats } from './xr/performanceStats'
import { SnowSurferController } from './xr/SnowSurferController'
import { xrStore } from './xr/store'
import { XRPerformanceMonitor } from './xr/XRPerformanceMonitor'
import { XRStatusPanel } from './xr/XRStatusPanel'

const CAMERA_CONFIG = {
  position: [0, 10, 18] as [number, number, number],
  fov: 50,
}
const RENDERER_CONFIG = {
  antialias: true,
  alpha: false,
  toneMapping: THREE.ACESFilmicToneMapping,
  // Rebalanced after the terrain shader started tone mapping correctly in
  // v0.2. At 1.15 sunlit snow sat in the flat top of the ACES curve and every
  // shading difference — including carved deformation — compressed to white.
  toneMappingExposure: 0.95,
}
const PIXEL_RATIO_RANGE: [number, number] = [1, 1.25]

export function App() {
  const [activeSpell, setActiveSpell] = useState<SpellEffect>(AVAILABLE_SPELLS[0])
  const [desktopCasting, setDesktopCasting] = useState(false)
  const [vrCasting, setVrCasting] = useState(false)
  const [isOrbiting, setIsOrbiting] = useState(false)
  const [telemetry, setTelemetry] = useState<SurferTelemetry>({
    speed: 0,
    carvingIntensity: 0,
    isCasting: false,
  })
  const [entryError, setEntryError] = useState<string | null>(null)
  const [contextLoss, setContextLoss] = useState(createContextLossState())
  const castingKeysRef = useRef(new Set<string>())
  const mouseCastingRef = useRef(false)
  const riderPositionRef = useRef(new THREE.Vector3())
  const isCasting = desktopCasting || vrCasting
  const showXrDevPanel = new URLSearchParams(window.location.search).get('dev') === '1'
  const deformationField = useMemo(() => new RideableDeformationField(), [])

  // Single mutable BrushState ref to prevent per-frame React re-renders!
  const brushRef = useRef<BrushState>({
    pos: new THREE.Vector3(999, 999, 0.5),
    depth: 0,
    berm: 1.2,
    ice: 0,
    wetness: 0,
    affectsRide: false,
  })

  // Dev controls state
  const [windDecay, setWindDecay] = useState(0.15)
  const [glintScale, setGlintScale] = useState(85.0)
  const [glintIntensity, setGlintIntensity] = useState(2.5)

  const handleContextLost = useCallback(() => {
    setContextLoss(markContextLost)
  }, [])
  const handleContextRestored = useCallback(() => {
    setContextLoss(markContextRestored)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.code === 'Digit1') setActiveSpell(AVAILABLE_SPELLS[0])
      if (e.code === 'Digit2') setActiveSpell(AVAILABLE_SPELLS[1])
      if (e.code === 'Digit3') setActiveSpell(AVAILABLE_SPELLS[2])
      if (e.code === 'Digit4') setActiveSpell(AVAILABLE_SPELLS[3])

      if (e.code === 'KeyC') {
        setIsOrbiting((prev) => !prev)
      }

      updateCastingKeys(castingKeysRef.current, e.code, true)
      setDesktopCasting(castingKeysRef.current.size > 0 || mouseCastingRef.current)
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      updateCastingKeys(castingKeysRef.current, e.code, false)
      setDesktopCasting(castingKeysRef.current.size > 0 || mouseCastingRef.current)
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        mouseCastingRef.current = true
        setDesktopCasting(true)
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        mouseCastingRef.current = false
        setDesktopCasting(castingKeysRef.current.size > 0)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  async function enterVr() {
    setEntryError(null)
    try {
      const session = await xrStore.enterVR()
      if (session === undefined) setEntryError('Immersive VR is not available in this browser.')
    } catch (err) {
      setEntryError(err instanceof Error ? err.message : 'VR session rejected.')
    }
  }

  return (
    <div className="app-container">
      {/* Glassmorphic UI Overlays */}
      <header className="overlay-panel header-overlay">
        <h1 className="header-title">SnowVR Quest Downhill</h1>
        <p className="header-subtitle">
          Ride downhill on your snowboard and cast elemental spells across the arctic snowfield!
        </p>
        <div style={{ fontSize: '0.82rem', color: '#74d7ee', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div>🥽 <b>Quest Controllers:</b> Left Thumbstick = Steer/Move | Right Trigger = Cast Spell | A/B = Swap Spell</div>
          <div>⌨️ <b>Keys 1 to 4:</b> Select Active Spell (Hydro, Glacier Trail, Melt, Vortex)</div>
          <div>🏎️ <b>WASD / Arrows:</b> Ride & Steer Snowboard (Space = Speed Boost!)</div>
          <div>✨ <b>Left Click (or Shift / E):</b> Fire Active Spell Stream</div>
        </div>
        <button type="button" className="enter-vr-btn" onClick={enterVr}>
          <span>🥽</span> Enter VR
        </button>
        {entryError && <p style={{ color: '#ef4444', fontSize: '0.8rem' }}>{entryError}</p>}
        {contextLoss.status === 'lost' && (
          <p style={{ color: '#fbbf24', fontSize: '0.8rem' }}>
            Rendering was interrupted. It will resume automatically.
          </p>
        )}
      </header>

      <DevOverlay
        windDecay={windDecay}
        setWindDecay={setWindDecay}
        glintScale={glintScale}
        setGlintScale={setGlintScale}
        glintIntensity={glintIntensity}
        setGlintIntensity={setGlintIntensity}
      />

      <SpellBar activeSpell={activeSpell} onSelectSpell={setActiveSpell} />

      <SnowAudioController speed={telemetry.speed} carvingIntensity={telemetry.carvingIntensity} />

      {/* 3D WebXR Canvas */}
      <Canvas
        camera={CAMERA_CONFIG}
        gl={RENDERER_CONFIG}
        dpr={PIXEL_RATIO_RANGE}
        shadows={false}
      >
        <XR store={xrStore}>
          <ContextLossGuard
            onLost={handleContextLost}
            onRestored={handleContextRestored}
          />
          <Atmosphere />
          <DistantMountains />
          <SlalomPoles />
          <FallingSnowParticles count={1200} />

          <SnowTerrain
            key={`terrain-${contextLoss.generation}`}
            brushRef={brushRef}
            windDecay={windDecay}
            glintScale={glintScale}
            glintIntensity={glintIntensity}
            deformationField={deformationField}
          />

          <SnowSurferController
            activeSpell={activeSpell}
            onSelectSpell={setActiveSpell}
            brushRef={brushRef}
            followCamera={!isOrbiting}
            desktopCasting={desktopCasting}
            onVrCastingChange={setVrCasting}
            onTelemetry={setTelemetry}
            riderPositionRef={riderPositionRef}
            deformationField={deformationField}
          />

          <XRStatusPanel
            activeSpell={activeSpell}
            speed={telemetry.speed}
            isCasting={isCasting}
            riderPositionRef={riderPositionRef}
          />

          <XRPerformanceMonitor
            showInHeadset={showXrDevPanel}
            onStats={publishPerformanceStats}
          />

          <GPGPUSpellParticles
            key={`spell-particles-${contextLoss.generation}`}
            activeSpell={activeSpell}
            brushRef={brushRef}
            isEmitting={isCasting}
            deformationField={deformationField}
          />

          <OrbitControls enabled={isOrbiting} maxPolarAngle={Math.PI / 2 - 0.02} minDistance={4} maxDistance={60} />
        </XR>
      </Canvas>
    </div>
  )
}
