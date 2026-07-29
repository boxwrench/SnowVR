import { useState } from 'react'
import type { PerformanceStats } from '../xr/performanceStats'

interface DevOverlayProps {
  readonly windDecay: number
  readonly setWindDecay: (v: number) => void
  readonly glintScale: number
  readonly setGlintScale: (v: number) => void
  readonly glintIntensity: number
  readonly setGlintIntensity: (v: number) => void
  readonly stats: PerformanceStats
}

export function DevOverlay({
  windDecay,
  setWindDecay,
  glintScale,
  setGlintScale,
  glintIntensity,
  setGlintIntensity,
  stats,
}: DevOverlayProps) {
  const [showDevPanel, setShowDevPanel] = useState(
    () => new URLSearchParams(window.location.search).get('dev') === '1',
  )
  const fps = Math.round(stats.fps)
  const refreshRate = stats.refreshRate === undefined ? '--' : `${stats.refreshRate.toFixed(0)} Hz`
  const foveation = stats.foveation === undefined ? '--' : stats.foveation.toFixed(2)

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
          <span style={{ color: '#4ade80', fontWeight: 700 }}>
            72 Hz
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#94a3b8' }}>Session:</span>
          <span style={{ color: '#38bdf8', fontWeight: 600 }}>
            {stats.isPresenting ? `XR ${refreshRate}` : 'Desktop'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#94a3b8' }}>Realtime FPS:</span>
          <span style={{ fontWeight: 700 }}>{fps || '--'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#94a3b8' }}>Frame Time:</span>
          <span>{stats.averageFrameMs.toFixed(1)} ms avg</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#94a3b8' }}>P95 / FFR:</span>
          <span>{stats.p95FrameMs.toFixed(1)} ms / {foveation}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#94a3b8' }}>Projection:</span>
          <span>{stats.projectionWidth || '--'} × {stats.projectionHeight || '--'}</span>
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
