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
}

export const AVAILABLE_SPELLS: ReadonlyArray<SpellEffect> = [
  {
    id: 'snow-surf',
    name: 'Snow Carver',
    key: '1',
    description: 'Carves narrow precision wakes with sleek side berms',
    brushRadius: 0.45,
    brushDepth: 0.4,
    brushBerm: 0.6,
    brushIce: 0.1,
    brushWetness: 0.0,
    color: '#74d7ee',
    vfxType: 'spray',
  },
  {
    id: 'hydro-stream',
    name: 'Hydro Stream',
    key: '2',
    description: 'Shoots a continuous high-pressure liquid water stream that cuts fluid trenches into snow',
    brushRadius: 0.85,
    brushDepth: 0.95,
    brushBerm: 0.3,
    brushIce: 0.2,
    brushWetness: 1.0,
    color: '#38bdf8',
    vfxType: 'liquid_stream',
  },
  {
    id: 'frost-spire',
    name: 'Frost Spire',
    key: '3',
    description: 'Freezes tall crystalline ice spires rising out of the ground',
    brushRadius: 0.6,
    brushDepth: -1.2,
    brushBerm: 0.0,
    brushIce: 1.0,
    brushWetness: 0.0,
    color: '#a5f3fc',
    vfxType: 'frost',
  },
  {
    id: 'thermal-melt',
    name: 'Thermal Melt',
    key: '4',
    description: 'Melts deep slush pools with shiny reflective water',
    brushRadius: 1.1,
    brushDepth: 1.1,
    brushBerm: 0.0,
    brushIce: 0.0,
    brushWetness: 1.0,
    color: '#ff9800',
    vfxType: 'thermal',
  },
  {
    id: 'vortex-mountain',
    name: 'Vortex Mountain',
    key: '5',
    description: 'Pulls snow inward to build up tall snow dunes & mountains',
    brushRadius: 1.6,
    brushDepth: -1.2,
    brushBerm: 1.8,
    brushIce: 0.2,
    brushWetness: 0.1,
    color: '#c084fc',
    vfxType: 'vortex',
  },
]
