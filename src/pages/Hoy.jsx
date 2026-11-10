import { useEffect, useState } from 'react'
import { useRows, useSingle } from '../lib/hooks'
import { useUser } from '../lib/user'
import { computeStreak, nutritionTargets } from '../lib/calc'
import { dayIndex, eur, fmtDuration, fmtTime, greeting, longDate, nowMinutes, toISODate } from '../lib/utils'
import { Bar, Card, Empty, Loading, PageHeader, Ring } from '../components/ui'
import { IconCheck, IconFlame } from '../components/icons'

export default function Hoy() {
  const { user, profile } = useUser()
  const today = toISODate()
  const day = dayIndex()

  const blocks = useRows('blocks', { match: { user_id: user.id } })
  const items = useRows('routine_items', { match: { user_id: user.id, day } })
  const workouts = useRows('workouts', { match: { user_id: user.id } })
  const log = useRows('workout_log', { match: { user_id: user.id } })
  const meals = useRows('meals', { match: { user_id: user.id, date: today } })
  const expenses = useRows('expenses', { match: { user_id: user.id } })
  const nutrition = useSingle('nutrition', user.id)
  const finance = useSingle('finance', user.id)

  // Refresca la hora cada minuto para mover el bloque "ahora".
  const [now, setNow] = useState(nowMinutes())
  useEffect(() => {
    const t = setInterval(() => setNow(nowMinutes()), 60000)
    return () => clearInterval(t)
  }, [])

  const loading = [blocks, items, workouts, log, meals, expenses, nutrition, finance].some((x) => x.loading)
  if (loading) return <Loading />

  const name = (id) => blocks.rows.find((b) => b.id === id)?.name ?? '—'
  const todays = [...items.rows].sort((a, b) => a.start_min - b.start_min)
  const current = todays.find((i) => i.start_min <= now && now < i.end_min)
  const next = todays.find((i) => i.start_min > now)

  const todaysWorkouts = workouts.rows.filter((w) => w.day === day)
  const doneDates = new Set(log.rows.map((l) => l.date))
  const doneToday = doneDates.has(today)
  const streak = computeStreak(doneDates, new Set(workouts.rows.map((w) => w.day)))

  async function toggleGym() {
    const existing = log.rows.find((l) => l.date === today)
    if (existing) await log.remove(existing.id)
    else await log.add({ date: today })
  }

  const targets = nutritionTargets(nutrition.row)
  const kcal = meals.rows.reduce((s, m) => s + m.kcal, 0)
  const protein = meals.rows.reduce((s, m) => s + Number(m.protein), 0)

  const monthKey = today.slice(0, 7)
  const spent = expenses.rows.filter((e) => e.date.startsWith(monthKey)).reduce((s, e) => s + Number(e.amount), 0)

  return (
    <>
      <PageHeader eyebrow={longDate()} title={`${greeting()}${profile?.username ? `, ${profile.username}` : ''}`} />

      <Card className="now-card">
        {current ? (
          <>
            <span className="eyebrow accent">Ahora</span>
            <p className="now-title">{name(current.block_id)}</p>
            <p className="muted">
              Hasta las {fmtTime(current.end_min)} · quedan {fmtDuration(current.end_min - now)}
            </p>
            <Bar value={now - current.start_min} max={current.end_min - current.start_min} label="Progreso del bloque" />
          </>
        ) : (
          <>
            <span className="eyebrow">Ahora</span>
            <p className="now-title">Tiempo libre</p>
            <p className="muted">
              {next ? `Siguiente: ${name(next.block_id)} a las ${fmtTime(next.start_min)}` : todays.length ? 'Has terminado los bloques de hoy.' : 'No tienes bloques para hoy.'}
            </p>
          </>
        )}
      </Card>

      <div className="grid">
        <Card title="Rutina de hoy" action={<a className="link" href="#semana">Editar</a>}>
          {todays.length === 0 ? (
            <Empty>Añade bloques a este día en Semana.</Empty>
          ) : (
            <ol className="timeline">
              {todays.map((i) => {
                const state = i.end_min <= now ? 'past' : i === current ? 'current' : 'future'
                return (
                  <li key={i.id} className={state}>
                    <span className="tl-time">{fmtTime(i.start_min)}</span>
                    <span className="tl-dot" aria-hidden="true" />
                    <span className="tl-name">{name(i.block_id)}</span>
                    <span className="muted small">{fmtDuration(i.end_min - i.start_min)}</span>
                  </li>
                )
              })}
            </ol>
          )}
        </Card>

        <Card title="Gym" action={<span className="streak-mini"><IconFlame size={15} /> {streak}</span>}>
          {todaysWorkouts.length === 0 ? (
            <p className="muted">Hoy toca descanso.</p>
          ) : (
            <ul className="list compact">
              {todaysWorkouts.map((w) => (
                <li key={w.id} className="ex-mini">
                  <span>{w.exercise}</span>
                  <span className="muted small num">
                    {w.sets ?? '–'}×{w.reps ?? '–'}{w.weight ? ` · ${Number(w.weight)} kg` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className={`btn btn-block top-gap ${doneToday ? 'btn-primary' : 'btn-outline'}`} onClick={toggleGym} aria-pressed={doneToday}>
            <IconCheck size={16} /> {doneToday ? 'Entrenamiento hecho' : 'Marcar como hecho'}
          </button>
        </Card>

        <Card title="Nutrición" action={<a className="link" href="#nutricion">Registrar</a>}>
          {targets ? (
            <div className="hoy-nutri">
              <Ring value={kcal} max={targets.kcal} size={112} stroke={7}>
                <span className="ring-mid">{kcal}</span>
                <span className="muted small">/ {targets.kcal}</span>
              </Ring>
              <div className="stack-sm">
                <span className="muted small">Proteína</span>
                <span>{Math.round(protein)} / {targets.protein} g</span>
                <Bar value={protein} max={targets.protein} label="Proteína" />
              </div>
            </div>
          ) : (
            <Empty>Completa tus datos en Nutrición para ver tu objetivo.</Empty>
          )}
        </Card>

        <Card title="Dinero" action={<a className="link" href="#dinero">Abrir</a>}>
          <div className="two-stats">
            <div className="stat">
              <span className="stat-label">En cuenta</span>
              <span className="stat-value">{eur(finance.row?.balance)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Gastado este mes</span>
              <span className="stat-value">{eur(spent)}</span>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}
