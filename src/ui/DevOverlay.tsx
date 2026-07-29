import { useEffect, useState } from 'react'

interface DevOverlayProps {
  readonly windDecay: number
  readonly setWindDecay: (v: number) => void
  readonly glintScale: number
  readonly setGlintScale: (v: number) => void
  readonly glintIntensity: number
  readonly setGlintIntensity: (v: number) => void
}

export function DevOverlay({
  windDecay,
  setWindDecay,
  glintScale,
  setGlintScale,
  glintIntensity,
  setGlintIntensity,
}: DevOverlayProps) {
  const [fps, setFps] = useState<number>(72)
  const [frameTime, setFrameTime] = useState<number>(13.8)
  const [showDevPanel, setShowDevPanel] = useState<boolean>(false)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('dev') === '1') {
      setShowDevPanel(true)
    }

    let frameCount = 0
    let lastTime = performance.now()
    let animationFrameId: number

    const tick = () => {
      frameCount++
      const now = performance.now()
      const delta = now - lastTime
      if (delta >= 500) {
        const currentFps = Math.round((frameCount * 1000) / delta)
        const currentFrameTime = parseFloat((delta / frameCount).toFixed(1))
        setFps(currentFps)
        setFrameTime(currentFrameTime)
        frameCount = 0
        lastTime = now
      }
      animationFrameId = requestAnimationFrame(tick)
    }

    animationFrameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animationFrameId)
  }, [])

  return (
    <>
      {/* Quest 3 Performance Overlay */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '12px',
          padding: '10px 14px',
          color: '#e2e8f0',
          fontFamily: 'monospace',
          fontSize: '0.8rem',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          minWidth: '160px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#94a3b8', fontWeight: 600 }}>Quest 3 Target:</span>
          <span style={{ color: fps >= 70 ? '#4ade80' : fps >= 60 ? '#facc15' : '#ef4444', fontWeight: 700 }}>
            72 FPS
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#94a3b8' }}>Native FFR:</span>
          <span style={{ color: '#38bdf8', fontWeight: 600 }}>Medium</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#94a3b8' }}>Realtime FPS:</span>
          <span style={{ fontWeight: 700 }}>{fps}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#94a3b8' }}>Frame Time:</span>
          <span>{frameTime} ms</span>
        </div>
        <button
          type="button"
          onClick={() => setShowDevPanel((prev) => !prev)}
          style={{
            marginTop: '4px',
            background: 'transparent',
            border: 'none',
            color: '#38bdf8',
            fontSize: '0.75rem',
            cursor: 'pointer',
            textAlign: 'right',
            padding: 0,
            textDecoration: 'underline',
          }}
        >
          {showDevPanel ? 'Hide Tuning' : 'Show Tuning (?dev=1)'}
        </button>
      </div>

      {/* Developer Tuning Panel */}
      {showDevPanel && (
        <div className="overlay-panel dev-panel-overlay">
          <div className="dev-panel-title">Shader & Physics Tuning</div>

          <div className="control-group">
            <div className="control-label">
              <span>Wind Decay (Refill)</span>
              <span>{windDecay.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={windDecay}
              onChange={(e) => setWindDecay(parseFloat(e.target.value))}
              className="control-slider"
            />
          </div>

          <div className="control-group">
            <div className="control-label">
              <span>Snow Glint Density</span>
              <span>{glintScale.toFixed(0)}</span>
            </div>
            <input
              type="range"
              min="20"
              max="120"
              step="5"
              value={glintScale}
              onChange={(e) => setGlintScale(parseFloat(e.target.value))}
              className="control-slider"
            />
          </div>

          <div className="control-group">
            <div className="control-label">
              <span>Glint Sparkle Intensity</span>
              <span>{glintIntensity.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="5.0"
              step="0.2"
              value={glintIntensity}
              onChange={(e) => setGlintIntensity(parseFloat(e.target.value))}
              className="control-slider"
            />
          </div>
        </div>
      )}
    </>
  )
}
