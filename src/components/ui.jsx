import { useEffect, useRef } from 'react'
import { IconX } from './icons'
import { TIME_OPTIONS, fmtTime } from '../lib/utils'

export function PageHeader({ eyebrow, title, children }) {
  return (
    <header className="page-head">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
      </div>
      {children}
    </header>
  )
}

export function Card({ title, action, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <div className="card-head">
          {title && <h2 className="card-title">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export const Empty = ({ children }) => <p className="empty">{children}</p>

export const Loading = () => (
  <div className="loading" role="status" aria-label="Cargando">
    <span />
  </div>
)

export function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export function Modal({ title, onClose, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    ref.current?.addEventListener('keydown', onKey)
    ref.current?.querySelector('input, select, button')?.focus()
    const node = ref.current
    return () => node?.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <IconX />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Segmented({ options, value, onChange, label, small }) {
  return (
    <div className={`seg ${small ? 'seg-sm' : ''}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function TimeSelect({ value, onChange, id }) {
  return (
    <select id={id} className="select" value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {TIME_OPTIONS.map((m) => (
        <option key={m} value={m}>
          {fmtTime(m)}
        </option>
      ))}
    </select>
  )
}

export function Ring({ value, max, size = 132, stroke = 8, children }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = max ? Math.min(value / max, 1) : 0
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--track)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={value > max && max ? 'var(--warn)' : 'var(--accent)'}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="ring-progress"
        />
      </svg>
      <div className="ring-label">{children}</div>
    </div>
  )
}

export function Bar({ value, max, label }) {
  const p = max ? Math.min(value / max, 1) * 100 : 0
  return (
    <div className="bar" role="progressbar" aria-label={label} aria-valuenow={Math.round(p)} aria-valuemin={0} aria-valuemax={100}>
      <i className={max && value > max ? 'over' : ''} style={{ width: `${p}%` }} />
    </div>
  )
}

export function Stat({ label, value, sub }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  )
}
