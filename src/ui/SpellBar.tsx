import { AVAILABLE_SPELLS, type SpellEffect } from '../experiments/SpellManager'

interface SpellBarProps {
  readonly activeSpell: SpellEffect
  readonly onSelectSpell: (spell: SpellEffect) => void
}

export function SpellBar({ activeSpell, onSelectSpell }: SpellBarProps) {
  return (
    <div className="overlay-panel spell-bar-overlay" role="toolbar" aria-label="Spell Toolbar">
      {AVAILABLE_SPELLS.map((spell) => (
        <button
          key={spell.id}
          type="button"
          className={`spell-btn ${activeSpell.id === spell.id ? 'active' : ''}`}
          style={{ borderColor: activeSpell.id === spell.id ? spell.color : undefined }}
          onClick={() => onSelectSpell(spell)}
        >
          <span className="spell-key" style={{ color: spell.color }}>{spell.key}</span>
          <span>{spell.name}</span>
        </button>
      ))}
    </div>
  )
}
