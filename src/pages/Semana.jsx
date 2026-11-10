import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRows } from '../lib/hooks'
import { useUser } from '../lib/user'
import { reportError } from '../lib/notify'
import { useFeedback } from '../components/Feedback'
import { DAYS, fmtDuration, fmtTime } from '../lib/utils'
import WeekGrid from '../components/WeekGrid'
import Select from '../components/Select'
import { Bar, Card, Empty, Field, Loading, Modal, PageHeader, TimeSelect } from '../components/ui'
import { IconPlus, IconTrash, IconX } from '../components/icons'

export default function Semana() {
  const { user } = useUser()
  const { confirm, toast } = useFeedback()
  const blocks = useRows('blocks', { match: { user_id: user.id } })
  const items = useRows('routine_items', { match: { user_id: user.id } })
  const [form, setForm] = useState(null) // { day, item? }
  const [copyFrom, setCopyFrom] = useState(null)
  const [name, setName] = useState('')

  const blockName = (id) => blocks.rows.find((b) => b.id === id)?.name ?? '—'

  async function createBlock(e) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    await blocks.add({ name: n })
    setName('')
    toast(`Bloque "${n}" creado`)
  }

  async function deleteBlock(b) {
    const ok = await confirm({
      title: `¿Borrar "${b.name}"?`,
      message: 'También se quitará de todos los días de tu semana.',
      confirmLabel: 'Borrar',
      danger: true,
    })
    if (!ok) return
    await blocks.remove(b.id)
    items.reload()
    toast(`"${b.name}" borrado`)
  }

  const hours = blocks.rows
    .map((b) => ({
      ...b,
      min: items.rows.filter((i) => i.block_id === b.id).reduce((s, i) => s + i.end_min - i.start_min, 0),
    }))
    .filter((b) => b.min > 0)
    .sort((a, b) => b.min - a.min)
  const maxMin = Math.max(1, ...hours.map((h) => h.min))

  if (blocks.loading || items.loading) return <Loading />

  return (
    <>
      <PageHeader eyebrow="Tu rutina tipo" title="Semana" />

      <Card title="Bloques de actividad">
        <form className="inline-form" onSubmit={createBlock}>
          <input
            className="input"
            placeholder="Nuevo bloque, p. ej. Gimnasio"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            aria-label="Nombre del bloque"
          />
          <button className="btn btn-primary" disabled={!name.trim()}>
            <IconPlus size={16} /> Crear
          </button>
        </form>
        {blocks.rows.length === 0 ? (
          <Empty>Crea tus bloques (Estudio, Gimnasio, Trabajo…) y colócalos en cada día.</Empty>
        ) : (
          <div className="chips">
            {blocks.rows.map((b) => (
              <span key={b.id} className="chip">
                {b.name}
                <button type="button" onClick={() => deleteBlock(b)} aria-label={`Borrar ${b.name}`}>
                  <IconX size={13} />
                </button>
              </span>
            ))}
          </div>
        )}
      </Card>

      <Card title="Tu semana" className="card-flush">
        <WeekGrid
          items={items.rows}
          blockName={blockName}
          onAdd={(day) => setForm({ day })}
          onSelect={(item) => setForm({ day: item.day, item })}
          onCopy={setCopyFrom}
        />
      </Card>

      {hours.length > 0 && (
        <Card title="Horas por semana">
          <ul className="list">
            {hours.map((h) => (
              <li key={h.id} className="hours-row">
                <span>{h.name}</span>
                <Bar value={h.min} max={maxMin} label={h.name} />
                <span className="muted num">{fmtDuration(h.min)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {form && <SlotForm {...form} blocks={blocks} items={items} onClose={() => setForm(null)} />}
      {copyFrom !== null && (
        <CopyDay from={copyFrom} userId={user.id} items={items} onClose={() => setCopyFrom(null)} />
      )}
    </>
  )
}

function SlotForm({ day, item, blocks, items, onClose }) {
  const lastEnd = Math.max(0, ...items.rows.filter((i) => i.day === day).map((i) => i.end_min))
  const defaultStart = item?.start_min ?? (lastEnd > 0 && lastEnd < 1440 ? lastEnd : 540)
  const [blockId, setBlockId] = useState(item?.block_id ?? blocks.rows[0]?.id ?? '')
  const [start, setStart] = useState(defaultStart)
  const [end, setEnd] = useState(item?.end_min ?? Math.min(defaultStart + 60, 1440))
  const [err, setErr] = useState(null)

  async function save(e) {
    e.preventDefault()
    if (end <= start) return setErr('La hora de fin debe ser posterior a la de inicio.')
    const clash = items.rows.find(
      (i) => i.day === day && i.id !== item?.id && start < i.end_min && end > i.start_min,
    )
    if (clash) return setErr(`Se solapa con otro bloque de ${fmtTime(clash.start_min)} a ${fmtTime(clash.end_min)}.`)
    const row = { block_id: Number(blockId), day, start_min: start, end_min: end }
    try {
      if (item) await items.update(item.id, row)
      else await items.add(row)
      onClose()
    } catch {
      setErr('No se ha podido guardar.')
    }
  }

  async function del() {
    await items.remove(item.id)
    onClose()
  }

  return (
    <Modal title={`${item ? 'Editar' : 'Añadir'} · ${DAYS[day]}`} onClose={onClose}>
      {blocks.rows.length === 0 ? (
        <Empty>Primero crea un bloque de actividad.</Empty>
      ) : (
        <form onSubmit={save} className="stack">
          <Field label="Bloque">
            <Select value={blockId} onChange={setBlockId} options={blocks.rows.map((b) => ({ value: b.id, label: b.name }))} />
          </Field>
          <div className="two">
            <Field label="Desde"><TimeSelect value={start} onChange={setStart} label="Desde" /></Field>
            <Field label="Hasta"><TimeSelect value={end} onChange={setEnd} label="Hasta" /></Field>
          </div>
          {end > start && <p className="muted small">Duración: {fmtDuration(end - start)}</p>}
          {err && <p className="error">{err}</p>}
          <div className="modal-actions">
            {item && (
              <button type="button" className="btn btn-ghost danger" onClick={del}>
                <IconTrash size={16} /> Quitar
              </button>
            )}
            <span className="spacer" />
            <button className="btn btn-primary">Guardar</button>
          </div>
        </form>
      )}
    </Modal>
  )
}

function CopyDay({ from, userId, items, onClose }) {
  const [targets, setTargets] = useState([])
  const [busy, setBusy] = useState(false)
  const toggle = (d) => setTargets((t) => (t.includes(d) ? t.filter((x) => x !== d) : [...t, d]))

  async function run() {
    setBusy(true)
    const source = items.rows.filter((i) => i.day === from)
    const del = await supabase.from('routine_items').delete().eq('user_id', userId).in('day', targets)
    const ins = del.error
      ? del
      : await supabase.from('routine_items').insert(
          targets.flatMap((day) =>
            source.map((s) => ({ block_id: s.block_id, day, start_min: s.start_min, end_min: s.end_min })),
          ),
        )
    if (ins.error) reportError(ins.error)
    await items.reload()
    onClose()
  }

  return (
    <Modal title={`Copiar ${DAYS[from]}`} onClose={onClose}>
      <p className="muted small">Elige los días. Lo que tengan ahora se reemplazará.</p>
      <div className="chips">
        {DAYS.map((d, i) =>
          i === from ? null : (
            <button
              type="button"
              key={d}
              className={`chip chip-toggle ${targets.includes(i) ? 'on' : ''}`}
              aria-pressed={targets.includes(i)}
              onClick={() => toggle(i)}
            >
              {d}
            </button>
          ),
        )}
      </div>
      <div className="modal-actions">
        <span className="spacer" />
        <button className="btn btn-primary" disabled={!targets.length || busy} onClick={run}>
          {busy ? 'Copiando…' : 'Copiar'}
        </button>
      </div>
    </Modal>
  )
}
