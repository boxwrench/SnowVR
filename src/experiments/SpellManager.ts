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
  vfxType: 'spray' | 'liquid_stream' | 'frost' | 'thermal' | 'vortex'
  // Intensity multiplier applied while actively casting (riding always carves at base level)
  castMultiplier: number
}

export const AVAILABLE_SPELLS: ReadonlyArray<SpellEffect> = [
  {
    id: 'snow-surf',
    name: 'Snow Carver',
    key: '1',
    description: 'Carves narrow precision wakes with sleek side berms',
    brushRadius: 0.5,
    brushDepth: 0.6,
    brushBerm: 0.9,
    brushIce: 0.05,
    brushWetness: 0.0,
    color: '#74d7ee',
    vfxType: 'spray',
    castMultiplier: 1.0,
  },
  {
    id: 'hydro-stream',
    name: 'Hydro Stream',
    key: '2',
    description: 'Shoots a continuous high-pressure liquid water stream that cuts fluid trenches into snow',
    brushRadius: 1.2,
    brushDepth: 1.8,
    brushBerm: 0.4,
    brushIce: 0.1,
    brushWetness: 1.0,
    color: '#38bdf8',
    vfxType: 'liquid_stream',
    castMultiplier: 2.5,
  },
  {
    id: 'frost-spire',
    name: 'Frost Spire',
    key: '3',
    description: 'Freezes tall crystalline ice columns rising out of the ground',
    brushRadius: 0.8,
    brushDepth: -2.5,
    brushBerm: 0.0,
    brushIce: 1.0,
    brushWetness: 0.0,
    color: '#a5f3fc',
    vfxType: 'frost',
    castMultiplier: 3.0,
  },
  {
    id: 'thermal-melt',
    name: 'Thermal Melt',
    key: '4',
    description: 'Melts deep slush pools with shiny reflective water',
    brushRadius: 1.6,
    brushDepth: 2.0,
    brushBerm: 0.0,
    brushIce: 0.0,
    brushWetness: 1.0,
    color: '#ff9800',
    vfxType: 'thermal',
    castMultiplier: 2.0,
  },
  {
    id: 'vortex-mountain',
    name: 'Vortex Mountain',
    key: '5',
    description: 'Pulls snow inward to build up tall snow dunes & mountains',
    brushRadius: 2.2,
    brushDepth: -3.0,
    brushBerm: 2.5,
    brushIce: 0.15,
    brushWetness: 0.05,
    color: '#c084fc',
    vfxType: 'vortex',
    castMultiplier: 3.0,
  },
]
