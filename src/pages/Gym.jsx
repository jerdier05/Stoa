import { useState } from 'react'
import { useRows } from '../lib/hooks'
import { useUser } from '../lib/user'
import { computeStreak } from '../lib/calc'
import { DAYS, DAYS_SHORT, addDays, dayIndex, toISODate, toNumber } from '../lib/utils'
import { Card, Empty, Loading, PageHeader, Segmented } from '../components/ui'
import { IconCheck, IconFlame, IconPlus, IconTrash } from '../components/icons'

export default function Gym() {
  const { user } = useUser()
  const workouts = useRows('workouts', { match: { user_id: user.id } })
  const log = useRows('workout_log', { match: { user_id: user.id }, order: 'date' })
  const [day, setDay] = useState(dayIndex())

  if (workouts.loading || log.loading) return <Loading />

  const plannedDays = new Set(workouts.rows.map((w) => w.day))
  const doneDates = new Set(log.rows.map((l) => l.date))
  const streak = computeStreak(doneDates, plannedDays)
  const today = toISODate()
  const last14 = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i - 13))
  const list = workouts.rows.filter((w) => w.day === day)

  async function toggle(iso) {
    const existing = log.rows.find((l) => l.date === iso)
    if (existing) await log.remove(existing.id)
    else await log.add({ date: iso })
  }

  return (
    <>
      <PageHeader eyebrow="Entrenamiento" title="Gym" />

      <Card className="streak-card">
        <div className="streak-top">
          <div className="streak-num">
            <IconFlame size={22} />
            <span className="big">{streak}</span>
            <span className="muted">{streak === 1 ? 'día de racha' : 'días de racha'}</span>
          </div>
          <button
            type="button"
            className={`btn ${doneDates.has(today) ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => toggle(today)}
            aria-pressed={doneDates.has(today)}
          >
            <IconCheck size={16} /> {doneDates.has(today) ? 'Hoy completado' : 'Marcar hoy'}
          </button>
        </div>
        <div className="dots" aria-label="Últimos 14 días">
          {last14.map((d) => {
            const iso = toISODate(d)
            const done = doneDates.has(iso)
            const rest = plannedDays.size > 0 && !plannedDays.has(dayIndex(d))
            return (
              <button
                type="button"
                key={iso}
                className={`dot ${done ? 'done' : ''} ${rest ? 'rest' : ''} ${iso === today ? 'today' : ''}`}
                onClick={() => toggle(iso)}
                aria-label={`${d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' })}: ${done ? 'hecho' : 'no hecho'}`}
                aria-pressed={done}
              >
                <span>{DAYS_SHORT[dayIndex(d)]}</span>
              </button>
            )
          })}
        </div>
      </Card>

      <Card
        title={`Rutina · ${DAYS[day]}`}
        action={
          <Segmented
            small
            label="Día"
            value={day}
            onChange={setDay}
            options={DAYS_SHORT.map((d, i) => ({ value: i, label: d }))}
          />
        }
      >
        {list.length === 0 ? (
          <Empty>Día de descanso. Añade ejercicios abajo si entrenas este día.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Ejercicio</th>
                  <th className="num">Series</th>
                  <th className="num">Reps</th>
                  <th className="num">Peso (kg)</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {list.map((w) => (
                  <ExerciseRow key={w.id} w={w} onSave={(p) => workouts.update(w.id, p)} onDelete={() => workouts.remove(w.id)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        <AddExercise day={day} onAdd={workouts.add} />
      </Card>
    </>
  )
}

// Cada celda se edita en el sitio y se guarda al salir del campo.
function ExerciseRow({ w, onSave, onDelete }) {
  const save = (field, raw) => {
    const value = field === 'exercise' ? raw.trim() : toNumber(raw)
    if (field === 'exercise' && !value) return
    if (value !== w[field] && String(value) !== String(w[field])) onSave({ [field]: value })
  }
  return (
    <tr>
      <td>
        <input className="cell" defaultValue={w.exercise} onBlur={(e) => save('exercise', e.target.value)} aria-label="Ejercicio" />
      </td>
      {['sets', 'reps', 'weight'].map((f) => (
        <td key={f} className="num">
          <input
            className="cell num"
            inputMode="decimal"
            defaultValue={w[f] ?? ''}
            onBlur={(e) => save(f, e.target.value)}
            aria-label={f}
          />
        </td>
      ))}
      <td className="num">
        <button type="button" className="icon-btn sm" onClick={onDelete} aria-label={`Borrar ${w.exercise}`}>
          <IconTrash size={15} />
        </button>
      </td>
    </tr>
  )
}

function AddExercise({ day, onAdd }) {
  const [f, setF] = useState({ exercise: '', sets: '3', reps: '10', weight: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    if (!f.exercise.trim()) return
    await onAdd({
      day,
      exercise: f.exercise.trim(),
      sets: toNumber(f.sets),
      reps: toNumber(f.reps),
      weight: toNumber(f.weight),
    })
    setF({ ...f, exercise: '', weight: '' })
  }

  return (
    <form className="add-exercise" onSubmit={submit}>
      <input className="input" placeholder="Ejercicio" value={f.exercise} onChange={set('exercise')} aria-label="Ejercicio" maxLength={60} />
      <input className="input num" placeholder="Series" inputMode="numeric" value={f.sets} onChange={set('sets')} aria-label="Series" />
      <input className="input num" placeholder="Reps" inputMode="numeric" value={f.reps} onChange={set('reps')} aria-label="Repeticiones" />
      <input className="input num" placeholder="Kg" inputMode="decimal" value={f.weight} onChange={set('weight')} aria-label="Peso en kg" />
      <button className="btn btn-primary" disabled={!f.exercise.trim()} aria-label="Añadir ejercicio">
        <IconPlus size={16} />
      </button>
    </form>
  )
}
