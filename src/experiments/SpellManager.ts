export interface SpellEffect {
  id: string
  name: string
  key: string
  description: string
  brushRadius: number
  brushDepth: number
  brushBerm: number
  brushIce: number
  brushWetness: number
  color: string
  vfxType: 'liquid_stream' | 'frost' | 'thermal' | 'vortex'
  vfxIntensity: number
  // Intensity multiplier applied while actively casting (riding always carves at base level)
  castMultiplier: number
}

export const AVAILABLE_SPELLS: ReadonlyArray<SpellEffect> = [
  {
    id: 'hydro-stream',
    name: 'Hydro Stream',
    key: '1',
    description: 'Cuts a wide wet halfpipe with tall rideable snow walls',
    brushRadius: 2.4,
    brushDepth: 1.8,
    brushBerm: 1.2,
    brushIce: 0.1,
    brushWetness: 1.0,
    color: '#38bdf8',
    vfxType: 'liquid_stream',
    vfxIntensity: 0.525,
    castMultiplier: 2.5,
  },
  {
    id: 'glacier-trail',
    name: 'Glacier Trail',
    key: '2',
    description: 'Paints a slick ice path that accelerates the snowboard',
    brushRadius: 2.8,
    brushDepth: 0.0,
    brushBerm: 0.0,
    brushIce: 1.0,
    brushWetness: 0.0,
    color: '#a5f3fc',
    vfxType: 'frost',
    vfxIntensity: 0.21,
    castMultiplier: 2.0,
  },
  {
    id: 'thermal-melt',
    name: 'Thermal Melt',
    key: '3',
    description: 'Melts deep slush pools with shiny reflective water',
    brushRadius: 1.6,
    brushDepth: 2.0,
    brushBerm: 0.0,
    brushIce: 0.0,
    brushWetness: 1.0,
    color: '#ff9800',
    vfxType: 'thermal',
    vfxIntensity: 0.4125,
    castMultiplier: 2.0,
  },
  {
    id: 'vortex-mountain',
    name: 'Vortex Mountain',
    key: '4',
    description: 'Pulls snow inward to build up tall snow dunes & mountains',
    brushRadius: 2.2,
    brushDepth: -3.0,
    brushBerm: 2.5,
    brushIce: 0.15,
    brushWetness: 0.0,
    color: '#c084fc',
    vfxType: 'vortex',
    vfxIntensity: 0.4875,
    castMultiplier: 3.0,
  },
]
