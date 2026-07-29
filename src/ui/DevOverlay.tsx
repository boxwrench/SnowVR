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
  return (
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
  )
}
