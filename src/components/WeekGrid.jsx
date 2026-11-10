import { DAYS, dayIndex, fmtTime } from '../lib/utils'
import { IconCopy, IconPlus } from './icons'

/**
 * La semana en horizontal. Se usa en la pestaña Semana (editable)
 * y en Perfil para ver la rutina de un amigo (solo lectura).
 */
export default function WeekGrid({ items, blockName, onAdd, onSelect, onCopy }) {
  const today = dayIndex()

  return (
    <div className="week">
      {DAYS.map((name, day) => {
        const list = items.filter((x) => x.day === day).sort((a, b) => a.start_min - b.start_min)
        return (
          <div key={day} className={`day ${day === today ? 'is-today' : ''}`}>
            <div className="day-head">
              <span>{name}</span>
              {onCopy && list.length > 0 && (
                <button type="button" className="icon-btn sm" onClick={() => onCopy(day)} aria-label={`Copiar ${name} a otros días`}>
                  <IconCopy size={15} />
                </button>
              )}
            </div>

            <div className="day-body">
              {list.length === 0 && <p className="day-empty">Libre</p>}
              {list.map((it) =>
                onSelect ? (
                  <button type="button" key={it.id} className="slot" onClick={() => onSelect(it)}>
                    <span className="slot-name">{blockName(it.block_id)}</span>
                    <span className="slot-time">
                      {fmtTime(it.start_min)} – {fmtTime(it.end_min)}
                    </span>
                  </button>
                ) : (
                  <div key={it.id} className="slot">
                    <span className="slot-name">{blockName(it.block_id)}</span>
                    <span className="slot-time">
                      {fmtTime(it.start_min)} – {fmtTime(it.end_min)}
                    </span>
                  </div>
                ),
              )}
            </div>

            {onAdd && (
              <button type="button" className="add-slot" onClick={() => onAdd(day)}>
                <IconPlus size={15} /> Añadir
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
