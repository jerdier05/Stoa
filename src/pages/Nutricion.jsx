import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRows, useSingle } from '../lib/hooks'
import { useUser } from '../lib/user'
import { nutritionTargets } from '../lib/calc'
import { addDays, fromISO, longDate, toISODate, toNumber } from '../lib/utils'
import { Bar, Card, Empty, Field, Loading, PageHeader, Ring, Segmented } from '../components/ui'
import { IconLeft, IconPlus, IconRight, IconTrash } from '../components/icons'

const ACTIVITY = [
  { value: '1.2', label: 'Sedentaria' },
  { value: '1.375', label: 'Ligera · 1–3 días' },
  { value: '1.55', label: 'Moderada · 3–5 días' },
  { value: '1.725', label: 'Alta · 6–7 días' },
  { value: '1.9', label: 'Muy alta' },
]

export default function Nutricion() {
  const { user } = useUser()
  const settings = useSingle('nutrition', user.id)
  const [date, setDate] = useState(toISODate())
  const meals = useRows('meals', { match: { user_id: user.id, date } })
  const [editing, setEditing] = useState(false)
  const [recent, setRecent] = useState([])

  // Comidas recientes para añadirlas con un toque.
  useEffect(() => {
    supabase
      .from('meals')
      .select('name,kcal,protein,carbs,fat')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(60)
      .then(({ data }) => {
        const seen = new Set()
        setRecent((data || []).filter((m) => !seen.has(m.name) && seen.add(m.name)).slice(0, 8))
      })
  }, [user.id])

  if (settings.loading) return <Loading />

  const t = nutritionTargets(settings.row)
  if (!t || editing)
    return (
      <>
        <PageHeader eyebrow="Tus datos" title="Nutrición" />
        <SettingsForm
          initial={settings.row}
          onCancel={t ? () => setEditing(false) : null}
          onSave={async (v) => {
            await settings.save(v)
            setEditing(false)
          }}
        />
      </>
    )

  const total = meals.rows.reduce(
    (s, m) => ({
      kcal: s.kcal + m.kcal,
      protein: s.protein + Number(m.protein),
      carbs: s.carbs + Number(m.carbs),
      fat: s.fat + Number(m.fat),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  )
  const isToday = date === toISODate()
  const shift = (n) => setDate(toISODate(addDays(fromISO(date), n)))

  async function addMeal(m) {
    const [row] = await meals.add({ ...m, date })
    setRecent((r) => [row, ...r.filter((x) => x.name !== row.name)].slice(0, 8))
  }

  return (
    <>
      <PageHeader eyebrow="Objetivo diario" title="Nutrición">
        <button type="button" className="btn btn-ghost" onClick={() => setEditing(true)}>Ajustar datos</button>
      </PageHeader>

      <div className="date-nav">
        <button type="button" className="icon-btn" onClick={() => shift(-1)} aria-label="Día anterior"><IconLeft /></button>
        <span className="date-label">{isToday ? 'Hoy' : longDate(fromISO(date))}</span>
        <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label="Día siguiente" disabled={isToday}><IconRight /></button>
      </div>

      <div className="grid">
        <Card title="Calorías" className="center-card">
          <Ring value={total.kcal} max={t.kcal} size={156}>
            <span className="ring-big">{Math.round(total.kcal)}</span>
            <span className="muted small">de {t.kcal} kcal</span>
          </Ring>
          <p className="muted small">
            {total.kcal <= t.kcal ? `Te quedan ${t.kcal - Math.round(total.kcal)} kcal` : `${Math.round(total.kcal) - t.kcal} kcal por encima`}
          </p>
        </Card>

        <Card title="Macros">
          <ul className="list macros">
            <Macro label="Proteína" value={total.protein} target={t.protein} />
            <Macro label="Carbohidratos" value={total.carbs} target={t.carbs} />
            <Macro label="Grasa" value={total.fat} target={t.fat} />
          </ul>
          <div className="micro-row">
            <span><span className="muted">Fibra</span> {t.fiber} g</span>
            <span><span className="muted">Agua</span> {String(t.water).replace('.', ',')} L</span>
          </div>
        </Card>
      </div>

      <Card title="Comidas">
        {meals.loading ? (
          <Loading />
        ) : meals.rows.length === 0 ? (
          <Empty>Aún no has registrado nada este día.</Empty>
        ) : (
          <ul className="list">
            {meals.rows.map((m) => (
              <li key={m.id} className="meal-row">
                <div>
                  <span>{m.name}</span>
                  <span className="muted small">
                    P {Number(m.protein)} · C {Number(m.carbs)} · G {Number(m.fat)}
                  </span>
                </div>
                <span className="num">{m.kcal} kcal</span>
                <button type="button" className="icon-btn sm" onClick={() => meals.remove(m.id)} aria-label={`Borrar ${m.name}`}>
                  <IconTrash size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {recent.length > 0 && (
          <div className="recent">
            <span className="muted small">Recientes</span>
            <div className="chips">
              {recent.map((r) => (
                <button
                  type="button"
                  key={r.name}
                  className="chip chip-toggle"
                  onClick={() => addMeal({ name: r.name, kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat })}
                >
                  <IconPlus size={13} /> {r.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <AddMeal onAdd={addMeal} />
      </Card>
    </>
  )
}

function Macro({ label, value, target }) {
  return (
    <li className="macro">
      <div className="macro-head">
        <span>{label}</span>
        <span className="muted num">{Math.round(value)} / {target} g</span>
      </div>
      <Bar value={value} max={target} label={label} />
    </li>
  )
}

function AddMeal({ onAdd }) {
  const empty = { name: '', kcal: '', protein: '', carbs: '', fat: '' }
  const [f, setF] = useState(empty)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    if (!f.name.trim()) return
    await onAdd({
      name: f.name.trim(),
      kcal: Math.round(toNumber(f.kcal) || 0),
      protein: toNumber(f.protein) || 0,
      carbs: toNumber(f.carbs) || 0,
      fat: toNumber(f.fat) || 0,
    })
    setF(empty)
  }

  return (
    <form className="add-meal" onSubmit={submit}>
      <input className="input" placeholder="Comida" value={f.name} onChange={set('name')} aria-label="Comida" maxLength={60} />
      <input className="input num" placeholder="kcal" inputMode="numeric" value={f.kcal} onChange={set('kcal')} aria-label="Calorías" />
      <input className="input num" placeholder="P" inputMode="decimal" value={f.protein} onChange={set('protein')} aria-label="Proteína en gramos" />
      <input className="input num" placeholder="C" inputMode="decimal" value={f.carbs} onChange={set('carbs')} aria-label="Carbohidratos en gramos" />
      <input className="input num" placeholder="G" inputMode="decimal" value={f.fat} onChange={set('fat')} aria-label="Grasa en gramos" />
      <button className="btn btn-primary" disabled={!f.name.trim()} aria-label="Añadir comida">
        <IconPlus size={16} />
      </button>
    </form>
  )
}

function SettingsForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState({
    sex: initial?.sex ?? 'm',
    age: initial?.age ?? '',
    weight: initial?.weight ?? '',
    height: initial?.height ?? '',
    activity: String(Number(initial?.activity ?? 1.55)),
    goal: initial?.goal ?? 'keep',
  })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const valid = toNumber(f.age) > 0 && toNumber(f.weight) > 0 && toNumber(f.height) > 0

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    await onSave({
      sex: f.sex,
      age: toNumber(f.age),
      weight: toNumber(f.weight),
      height: toNumber(f.height),
      activity: Number(f.activity),
      goal: f.goal,
    })
    setBusy(false)
  }

  return (
    <Card title="Calcula tu objetivo">
      <form className="stack" onSubmit={submit}>
        <Field label="Sexo">
          <Segmented label="Sexo" value={f.sex} onChange={(v) => setF({ ...f, sex: v })} options={[{ value: 'm', label: 'Hombre' }, { value: 'f', label: 'Mujer' }]} />
        </Field>
        <div className="three">
          <Field label="Edad"><input className="input" inputMode="numeric" value={f.age} onChange={set('age')} /></Field>
          <Field label="Peso (kg)"><input className="input" inputMode="decimal" value={f.weight} onChange={set('weight')} /></Field>
          <Field label="Altura (cm)"><input className="input" inputMode="numeric" value={f.height} onChange={set('height')} /></Field>
        </div>
        <Field label="Actividad">
          <select className="select" value={f.activity} onChange={set('activity')}>
            {ACTIVITY.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </Field>
        <Field label="Objetivo">
          <Segmented
            label="Objetivo"
            value={f.goal}
            onChange={(v) => setF({ ...f, goal: v })}
            options={[{ value: 'lose', label: 'Perder' }, { value: 'keep', label: 'Mantener' }, { value: 'gain', label: 'Ganar' }]}
          />
        </Field>
        <div className="modal-actions">
          {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>}
          <span className="spacer" />
          <button className="btn btn-primary" disabled={!valid || busy}>Guardar</button>
        </div>
      </form>
    </Card>
  )
}
