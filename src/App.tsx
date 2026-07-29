import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { XR } from '@react-three/xr'
import { useCallback, useEffect, useState } from 'react'
import * as THREE from 'three'

import { Atmosphere } from './environment/Atmosphere'
import { CinematicPostProcessing } from './environment/CinematicPostProcessing'
import { DistantMountains } from './environment/DistantMountains'
import { FallingSnowParticles } from './environment/FallingSnowParticles'
import { SpellParticleSystem } from './environment/SpellParticleSystem'
import { AVAILABLE_SPELLS, type SpellEffect } from './experiments/SpellManager'
import { SnowTerrain } from './snow/SnowTerrain'
import { DevOverlay } from './ui/DevOverlay'
import { SpellBar } from './ui/SpellBar'
import { SnowSurferController } from './xr/SnowSurferController'
import { xrStore } from './xr/store'

export function App() {
  const [activeSpell, setActiveSpell] = useState<SpellEffect>(AVAILABLE_SPELLS[0])
  const [brushPos, setBrushPos] = useState<THREE.Vector3>(new THREE.Vector3(999, 999, 0.5))
  const [brushDepth, setBrushDepth] = useState<number>(0)
  const [brushBerm, setBrushBerm] = useState<number>(1.2)
  const [brushIce, setBrushIce] = useState<number>(0)
  const [brushWetness, setBrushWetness] = useState<number>(0)
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false)
  const [entryError, setEntryError] = useState<string | null>(null)

  // Shader & Physics tuning state
  const [windDecay, setWindDecay] = useState<number>(0.15)
  const [glintScale, setGlintScale] = useState<number>(85.0)
  const [glintIntensity, setGlintIntensity] = useState<number>(2.5)

  const handleBrushUpdate = useCallback(
    (
      pos: THREE.Vector3,
      depth: number,
      berm: number,
      ice: number,
      wetness: number
    ) => {
      setBrushPos(pos)
      setBrushDepth(depth)
      setBrushBerm(berm)
      setBrushIce(ice)
      setBrushWetness(wetness)
    },
    []
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const match = AVAILABLE_SPELLS.find((s) => s.key === e.key)
      if (match) setActiveSpell(match)
    }
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) setIsMouseDown(true)
    }
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) setIsMouseDown(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
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
        <h1 className="header-title">SnowVR Surfer Engine</h1>
        <p className="header-subtitle">
          Speed around the 120m arctic snowfield with high-velocity banking, snow carving, and dynamic spell effects.
        </p>
        <p style={{ fontSize: '0.8rem', color: '#74d7ee' }}>
          🏎️ <b>WASD / Arrows:</b> Speed & Steer Surfer | <b>Space:</b> Speed Boost <br />
          🖱️ <b>Right Click & Drag:</b> Orbit Camera | <b>Keys 1-5:</b> Switch Spells
        </p>
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

      {/* 3D WebXR Canvas */}
      <Canvas
        camera={{ position: [0, 10, 18], fov: 50 }}
        gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }}
        dpr={[1, 1.5]}
        shadows
      >
        <XR store={xrStore}>
          <Atmosphere />
          <DistantMountains />
          <FallingSnowParticles count={3000} />
          
          <SnowTerrain
            brushPosition={brushPos}
            brushDepth={brushDepth}
            brushBerm={brushBerm}
            brushIce={brushIce}
            brushWetness={brushWetness}
            windDecay={windDecay}
            glintScale={glintScale}
            glintIntensity={glintIntensity}
          />

          <SnowSurferController
            activeSpell={activeSpell}
            onBrushUpdate={handleBrushUpdate}
            followCamera={!isMouseDown}
          />

          <SpellParticleSystem
            activeSpell={activeSpell}
            brushPos={brushPos}
            isEmitting={true}
          />

          <CinematicPostProcessing />

          <OrbitControls enabled={isMouseDown} maxPolarAngle={Math.PI / 2 - 0.02} minDistance={4} maxDistance={60} />
        </XR>
      </Canvas>
    </div>
  )
}
