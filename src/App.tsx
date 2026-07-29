import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { XR } from '@react-three/xr'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

import { Atmosphere } from './environment/Atmosphere'
import { DistantMountains } from './environment/DistantMountains'
import { FallingSnowParticles } from './environment/FallingSnowParticles'
import { GPGPUSpellParticles } from './environment/GPGPUSpellParticles'
import { SlalomPoles } from './environment/SlalomPoles'
import { SnowAudioController } from './environment/SnowAudioController'
import { AVAILABLE_SPELLS, type SpellEffect } from './experiments/SpellManager'
import { SnowTerrain, type BrushState } from './snow/SnowTerrain'
import { DevOverlay } from './ui/DevOverlay'
import { SpellBar } from './ui/SpellBar'
import { SnowSurferController } from './xr/SnowSurferController'
import { xrStore } from './xr/store'

export function App() {
  const [activeSpell, setActiveSpell] = useState<SpellEffect>(AVAILABLE_SPELLS[0])
  const [isCasting, setIsCasting] = useState<boolean>(false) // Default to FALSE - deliberate spell casting only!
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false)
  const [entryError, setEntryError] = useState<string | null>(null)

  // Single mutable BrushState ref to prevent per-frame React re-renders!
  const brushRef = useRef<BrushState>({
    pos: new THREE.Vector3(999, 999, 0.5),
    depth: 0,
    berm: 1.2,
    ice: 0,
    wetness: 0,
  })

  // Shader & Physics tuning state
  const [windDecay, setWindDecay] = useState<number>(0.15)
  const [glintScale, setGlintScale] = useState<number>(85.0)
  const [glintIntensity, setGlintIntensity] = useState<number>(2.5)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const match = AVAILABLE_SPELLS.find((s) => s.key === e.key)
      if (match) setActiveSpell(match)
      if (e.key === 'e' || e.key === 'E' || e.key === 'Shift') setIsCasting(true)
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'e' || e.key === 'E' || e.key === 'Shift') setIsCasting(false)
    }
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        setIsMouseDown(true)
        setIsCasting(true)
      }
    }
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        setIsMouseDown(false)
        setIsCasting(false)
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
          <div>⌨️ <b>Keys 1 to 5:</b> Select Active Spell (Carver, Hydro Jet, Frost Spire, Melt, Vortex)</div>
          <div>🏎️ <b>WASD / Arrows:</b> Ride & Steer Snowboard (Space = Speed Boost!)</div>
          <div>✨ <b>Left Click (or Shift / E):</b> Fire Active Spell Stream</div>
        </div>
        <button type="button" className="enter-vr-btn" onClick={enterVr}>
          <span>🥽</span> Enter VR
        </button>
        {entryError && <p style={{ color: '#ef4444', fontSize: '0.8rem' }}>{entryError}</p>}
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

      <SnowAudioController speed={12} isCarving={isCasting} />

      {/* 3D WebXR Canvas */}
      <Canvas
        camera={{ position: [0, 10, 18], fov: 50 }}
        gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }}
        dpr={[1, 1.25]}
        shadows={false}
      >
        <XR store={xrStore}>
          <Atmosphere />
          <DistantMountains />
          <SlalomPoles />
          <FallingSnowParticles count={1200} />

          <SnowTerrain
            brushRef={brushRef}
            windDecay={windDecay}
            glintScale={glintScale}
            glintIntensity={glintIntensity}
          />

          <SnowSurferController
            activeSpell={activeSpell}
            onSelectSpell={setActiveSpell}
            brushRef={brushRef}
            followCamera={!isMouseDown}
            isMouseDown={isMouseDown}
            isCasting={isCasting}
            setIsCasting={setIsCasting}
          />

          <GPGPUSpellParticles
            activeSpell={activeSpell}
            brushRef={brushRef}
            isEmitting={isCasting}
          />

          <OrbitControls enabled={isMouseDown} maxPolarAngle={Math.PI / 2 - 0.02} minDistance={4} maxDistance={60} />
        </XR>
      </Canvas>
    </div>
  )
}
