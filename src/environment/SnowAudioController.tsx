import { useEffect, useRef } from 'react'

/**
 * Synthesizes procedural wind and snow carving sound effects via Web Audio API.
 * Requires zero audio asset files to download.
 */
export function SnowAudioController({
  speed = 0,
  carvingIntensity = 0,
}: {
  readonly speed?: number
  readonly carvingIntensity?: number
}) {
  const audioCtxRef = useRef<AudioContext | null>(null)
  const windGainRef = useRef<GainNode | null>(null)
  const windFilterRef = useRef<BiquadFilterNode | null>(null)
  const scrapeGainRef = useRef<GainNode | null>(null)

  useEffect(() => {
    const initAudio = () => {
      if (audioCtxRef.current) return

      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        const ctx = new AudioContextClass()
        audioCtxRef.current = ctx

        // White noise generator for wind
        const bufferSize = ctx.sampleRate * 2
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        const output = noiseBuffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1
        }

        const whiteNoise = ctx.createBufferSource()
        whiteNoise.buffer = noiseBuffer
        whiteNoise.loop = true

        // Wind low-pass filter
        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.setValueAtTime(300, ctx.currentTime)
        windFilterRef.current = filter

        // Wind gain control
        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.05, ctx.currentTime)
        windGainRef.current = gain

        // Board scrape gain
        const scrapeGain = ctx.createGain()
        scrapeGain.gain.setValueAtTime(0.0, ctx.currentTime)
        scrapeGainRef.current = scrapeGain
        const scrapeFilter = ctx.createBiquadFilter()
        scrapeFilter.type = 'bandpass'
        scrapeFilter.frequency.setValueAtTime(1800, ctx.currentTime)
        scrapeFilter.Q.setValueAtTime(0.8, ctx.currentTime)

        whiteNoise.connect(filter)
        filter.connect(gain)
        gain.connect(ctx.destination)
        whiteNoise.connect(scrapeFilter)
        scrapeFilter.connect(scrapeGain)
        scrapeGain.connect(ctx.destination)

        whiteNoise.start()
      } catch {
        // Web Audio not supported or blocked by browser policy
      }
    }

    const handleUserGesture = () => {
      initAudio()
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume()
      }
    }

    window.addEventListener('pointerdown', handleUserGesture, { once: true })
    window.addEventListener('keydown', handleUserGesture, { once: true })

    return () => {
      window.removeEventListener('pointerdown', handleUserGesture)
      window.removeEventListener('keydown', handleUserGesture)
      if (audioCtxRef.current) {
        audioCtxRef.current.close()
      }
    }
  }, [])

  useEffect(() => {
    if (!audioCtxRef.current || !windGainRef.current || !windFilterRef.current) return

    const normSpeed = Math.min(speed / 28.0, 1.0)
    const targetFreq = 250 + normSpeed * 1200
    const targetVolume = 0.03 + normSpeed * 0.2

    const now = audioCtxRef.current.currentTime
    windFilterRef.current.frequency.setTargetAtTime(targetFreq, now, 0.1)
    windGainRef.current.gain.setTargetAtTime(targetVolume, now, 0.1)

    if (scrapeGainRef.current) {
      const scrapeVol = speed > 1.0
        ? Math.min(1, carvingIntensity) * (0.04 + normSpeed * 0.18)
        : 0
      scrapeGainRef.current.gain.setTargetAtTime(scrapeVol, now, 0.05)
    }
  }, [speed, carvingIntensity])

  return null
}
