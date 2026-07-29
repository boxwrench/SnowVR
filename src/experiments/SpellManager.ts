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
  vfxType: 'spray' | 'impact' | 'frost' | 'thermal' | 'vortex'
}

export const AVAILABLE_SPELLS: ReadonlyArray<SpellEffect> = [
  {
    id: 'snow-surf',
    name: 'Snow Carver',
    key: '1',
    description: 'Carves narrow precision wakes with crisp twin side berms',
    brushRadius: 0.5,
    brushDepth: 0.8,
    brushBerm: 1.4,
    brushIce: 0.1,
    brushWetness: 0.0,
    color: '#74d7ee',
    vfxType: 'spray',
  },
  {
    id: 'hydro-blast',
    name: 'Hydro Blast',
    key: '2',
    description: 'Explosive crater shockwave with a massive raised outer rim',
    brushRadius: 2.2,
    brushDepth: 1.6,
    brushBerm: 3.0,
    brushIce: 0.3,
    brushWetness: 0.7,
    color: '#38bdf8',
    vfxType: 'impact',
  },
  {
    id: 'frost-spire',
    name: 'Frost Spire',
    key: '3',
    description: 'Freezes tall crystalline ice spires rising out of the ground',
    brushRadius: 0.7,
    brushDepth: -1.8, // Negative depth = BUILD UP HEIGHT (Spire)
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
    brushRadius: 1.2,
    brushDepth: 1.5,
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
    brushRadius: 1.8,
    brushDepth: -1.4, // Negative depth = BUILD UP SWEEPING MOUNTAIN MOUND
    brushBerm: 2.5,
    brushIce: 0.2,
    brushWetness: 0.1,
    color: '#c084fc',
    vfxType: 'vortex',
  },
]
