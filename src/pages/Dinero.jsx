import { useEffect, useRef, useState } from 'react'
import { useRows, useSingle } from '../lib/hooks'
import { useUser } from '../lib/user'
import { useFeedback } from '../components/Feedback'
import { projectInvestment } from '../lib/calc'
import { eur, fromISO, monthName, toISODate, toNumber } from '../lib/utils'
import { Bar, Card, Empty, Field, Loading, PageHeader, Segmented } from '../components/ui'
import Select from '../components/Select'
import { IconLeft, IconPlus, IconRight, IconTrash } from '../components/icons'

// Reparto de ejemplo para no empezar vacío.
// Al insertar varias filas a la vez, todas deben llevar las mismas columnas:
// si a una le falta un campo, la API lo envía como null.
const DEFAULT_CATEGORIES = [
  { name: 'Gastos fijos', percent: 50, is_investment: false },
  { name: 'Ocio', percent: 15, is_investment: false },
  { name: 'Colchón', percent: 15, is_investment: false },
  { name: 'Inversión', percent: 20, is_investment: true },
]

export default function Dinero() {
  const { user } = useUser()
  const { confirm } = useFeedback()
  const fin = useSingle('finance', user.id)
  const cats = useRows('budget_categories', { match: { user_id: user.id } })
  const exps = useRows('expenses', { match: { user_id: user.id }, order: 'date', ascending: false })
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const seeded = useRef(false)

  // La primera vez se crea el reparto de ejemplo (solo si no hay ninguna categoría).
  useEffect(() => {
    if (!cats.loading && !cats.error && cats.rows.length === 0 && !seeded.current) {
      seeded.current = true
      cats.add(DEFAULT_CATEGORIES).catch(() => {})
    }
  }, [cats])

  if (fin.loading || cats.loading || exps.loading) return <Loading />

  const f = fin.row || { balance: 0, invested: 0, income: 0, return_rate: 7 }
  const income = Number(f.income)
  const totalPct = cats.rows.reduce((s, c) => s + Number(c.percent), 0)
  const investCats = cats.rows.filter((c) => c.is_investment)
  const monthlyInvest = investCats.reduce((sum, c) => sum + (income * Number(c.percent)) / 100, 0)

  const monthKey = toISODate(month).slice(0, 7)
  const monthExps = exps.rows.filter((e) => e.date.startsWith(monthKey))
  const spent = monthExps.reduce((s, e) => s + Number(e.amount), 0)
  const shiftMonth = (n) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))
  const isCurrentMonth = monthKey === toISODate().slice(0, 7)

  return (
    <>
      <PageHeader eyebrow="Finanzas personales" title="Dinero" />

      <div className="grid grid-3">
        <MoneyStat label="En cuenta" value={f.balance} onSave={(v) => fin.save({ balance: v })} />
        <MoneyStat label="Invertido" value={f.invested} onSave={(v) => fin.save({ invested: v })} />
        <MoneyStat label="Ingreso mensual" value={f.income} onSave={(v) => fin.save({ income: v })} />
      </div>

      <Card
        title="Reparto del sueldo"
        action={cats.rows.length > 0 && <span className={`badge ${totalPct === 100 ? '' : 'badge-warn'}`}>{totalPct} %</span>}
      >
        {cats.rows.length === 0 ? (
          <Empty>Crea tus categorías (gastos fijos, ocio, ahorro, inversión…) y reparte tu sueldo en porcentajes.</Empty>
        ) : (
          totalPct !== 100 && <p className="warn small">El reparto suma {totalPct} %. Ajústalo hasta llegar al 100 %.</p>
        )}
        <ul className="list">
          {cats.rows.map((c) => {
            const budget = (income * Number(c.percent)) / 100
            const used = monthExps.filter((e) => e.category_id === c.id).reduce((s, e) => s + Number(e.amount), 0)
            return (
              <li key={c.id} className="cat-row">
                <div className="cat-main">
                  <input className="cell" defaultValue={c.name} aria-label="Nombre de la categoría"
                    onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && cats.update(c.id, { name: e.target.value.trim() })} />
                  <div className="pct">
                    <input className="cell num" inputMode="decimal" defaultValue={Number(c.percent)} aria-label={`Porcentaje de ${c.name}`}
                      onBlur={(e) => { const v = toNumber(e.target.value) ?? 0; if (v !== Number(c.percent)) cats.update(c.id, { percent: v }) }} />
                    <span className="muted">%</span>
                  </div>
                  <span className="num">{eur(budget)}</span>
                  <button type="button" className="icon-btn sm" aria-label={`Borrar ${c.name}`}
                    onClick={async () => {
                      const ok = await confirm({
                        title: `¿Borrar "${c.name}"?`,
                        message: 'Los gastos de esta categoría se quedarán sin categoría.',
                        confirmLabel: 'Borrar',
                        danger: true,
                      })
                      if (ok) cats.remove(c.id)
                    }}>
                    <IconTrash size={15} />
                  </button>
                </div>
                {!c.is_investment && budget > 0 && (
                  <div className="cat-usage">
                    <Bar value={used} max={budget} label={`Gastado en ${c.name}`} />
                    <span className="muted small num">{eur(used)} gastado</span>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        <AddCategory onAdd={(name, isInvestment) => cats.add({ name, percent: 0, is_investment: isInvestment })} />
      </Card>

      <Card
        title="Gastos"
        action={
          <div className="date-nav compact">
            <button type="button" className="icon-btn sm" onClick={() => shiftMonth(-1)} aria-label="Mes anterior"><IconLeft size={16} /></button>
            <span className="date-label">{monthName(month)}</span>
            <button type="button" className="icon-btn sm" onClick={() => shiftMonth(1)} aria-label="Mes siguiente" disabled={isCurrentMonth}><IconRight size={16} /></button>
          </div>
        }
      >
        <p className="spent-total"><span className="big">{eur(spent, 2)}</span> <span className="muted">gastado</span></p>
        {isCurrentMonth && <AddExpense cats={cats.rows.filter((c) => !c.is_investment)} onAdd={exps.add} />}
        {monthExps.length === 0 ? (
          <Empty>Sin gastos este mes.</Empty>
        ) : (
          <ul className="list">
            {monthExps.map((e) => (
              <li key={e.id} className="meal-row">
                <div>
                  <span>{e.note || cats.rows.find((c) => c.id === e.category_id)?.name || 'Gasto'}</span>
                  <span className="muted small">
                    {fromISO(e.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    {e.note && cats.rows.find((c) => c.id === e.category_id) ? ` · ${cats.rows.find((c) => c.id === e.category_id).name}` : ''}
                  </span>
                </div>
                <span className="num">{eur(e.amount, 2)}</span>
                <button type="button" className="icon-btn sm" onClick={() => exps.remove(e.id)} aria-label="Borrar gasto">
                  <IconTrash size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Projection
        start={Number(f.invested)}
        monthly={monthlyInvest}
        rate={Number(f.return_rate)}
        onRate={(v) => fin.save({ return_rate: v })}
      />
    </>
  )
}

function MoneyStat({ label, value, onSave }) {
  const [v, setV] = useState(String(Number(value || 0)))
  useEffect(() => setV(String(Number(value || 0))), [value])
  const commit = () => {
    const n = toNumber(v) ?? 0
    if (n !== Number(value)) onSave(n)
  }
  return (
    <section className="card stat-card">
      <label className="stat-label" htmlFor={`m-${label}`}>{label}</label>
      <div className="money-input">
        <input id={`m-${label}`} inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
        <span>€</span>
      </div>
    </section>
  )
}

function AddCategory({ onAdd }) {
  const [name, setName] = useState('')
  const [investment, setInvestment] = useState(false)
  return (
    <form
      className="inline-form top-gap"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return
        onAdd(name.trim(), investment)
        setName('')
        setInvestment(false)
      }}
    >
      <input className="input" placeholder="Nueva categoría" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} aria-label="Nueva categoría" />
      <button
        type="button"
        className={`chip chip-toggle ${investment ? 'on' : ''}`}
        aria-pressed={investment}
        onClick={() => setInvestment((v) => !v)}
        title="Cuenta para la proyección de inversión"
      >
        Inversión
      </button>
      <button className="btn btn-outline" disabled={!name.trim()}><IconPlus size={16} /> Añadir</button>
    </form>
  )
}

function AddExpense({ cats, onAdd }) {
  const [amount, setAmount] = useState('')
  const [cat, setCat] = useState('')
  const [note, setNote] = useState('')

  async function submit(e) {
    e.preventDefault()
    const n = toNumber(amount)
    if (!n || n <= 0) return
    await onAdd({ amount: n, category_id: cat ? Number(cat) : null, note: note.trim() || null, date: toISODate() })
    setAmount('')
    setNote('')
  }

  return (
    <form className="add-expense" onSubmit={submit}>
      <input className="input num" placeholder="Importe" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Importe" />
      <Select
        value={cat}
        onChange={setCat}
        label="Categoría"
        options={[{ value: '', label: 'Sin categoría' }, ...cats.map((c) => ({ value: String(c.id), label: c.name }))]}
      />
      <input className="input" placeholder="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={60} aria-label="Nota" />
      <button className="btn btn-primary" disabled={!toNumber(amount)} aria-label="Añadir gasto"><IconPlus size={16} /></button>
    </form>
  )
}

function Projection({ start, monthly, rate, onRate }) {
  const [years, setYears] = useState(10)
  const [r, setR] = useState(String(rate))
  const data = projectInvestment({ start, monthly, rate: toNumber(r) || 0, years })
  const last = data[data.length - 1]
  const max = Math.max(1, ...data.map((d) => d.value))
  const W = 900
  const H = 200
  const gap = years > 15 ? 4 : 10
  const bw = W / years - gap

  return (
    <Card
      title="Proyección de inversión"
      action={<Segmented small label="Años" value={years} onChange={setYears} options={[5, 10, 20, 30].map((y) => ({ value: y, label: `${y}a` }))} />}
    >
      <div className="proj-inputs">
        <span className="muted small">Aportas {eur(monthly)} al mes (tu categoría de inversión)</span>
        <Field label="Rentabilidad anual">
          <div className="pct">
            <input className="input num narrow" inputMode="decimal" value={r} onChange={(e) => setR(e.target.value)}
              onBlur={() => toNumber(r) !== rate && onRate(toNumber(r) || 0)} />
            <span className="muted">%</span>
          </div>
        </Field>
      </div>

      <div className="grid grid-3 proj-stats">
        <div className="stat"><span className="stat-label">Valor final</span><span className="stat-value accent">{eur(last.value)}</span></div>
        <div className="stat"><span className="stat-label">Aportado</span><span className="stat-value">{eur(last.contributed)}</span></div>
        <div className="stat"><span className="stat-label">Ganancia</span><span className="stat-value">{eur(last.value - last.contributed)}</span></div>
      </div>

      <svg className="chart" viewBox={`0 0 ${W} ${H + 22}`} role="img" aria-label={`Proyección a ${years} años: ${eur(last.value)}`}>
        {data.map((d, i) => {
          const x = i * (W / years) + gap / 2
          const hTotal = (d.value / max) * H
          const hContrib = (Math.min(d.contributed, d.value) / max) * H
          const showLabel = years <= 10 || (i + 1) % 5 === 0
          return (
            <g key={d.year}>
              <title>{`Año ${d.year}: ${eur(d.value)} (aportado ${eur(d.contributed)})`}</title>
              <rect x={x} y={H - hTotal} width={bw} height={hTotal - hContrib} rx="3" fill="var(--accent)" />
              <rect x={x} y={H - hContrib} width={bw} height={hContrib} rx="3" fill="var(--track-strong)" />
              {showLabel && (
                <text x={x + bw / 2} y={H + 16} textAnchor="middle" className="chart-label">{d.year}</text>
              )}
            </g>
          )
        })}
      </svg>
      <div className="legend">
        <span><i className="sw sw-muted" /> Aportado</span>
        <span><i className="sw sw-accent" /> Ganancia</span>
      </div>
    </Card>
  )
}
