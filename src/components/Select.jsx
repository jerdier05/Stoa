import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconCheck } from './icons'

/**
 * Desplegable propio con el estilo de Stoa (sustituye al <select> nativo).
 * Se maneja con ratón, táctil y teclado: flechas, Inicio/Fin, Enter, Escape
 * y escribir la primera letra de una opción.
 *
 *   <Select value={v} onChange={setV} options={[{ value, label, hint? }]} />
 */
export default function Select({ value, onChange, options, label, placeholder = 'Elegir…' }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState(null)
  const btn = useRef(null)
  const list = useRef(null)
  const uid = useId()
  const listId = `${uid}-list`

  const selectedIndex = options.findIndex((o) => String(o.value) === String(value))
  const selected = options[selectedIndex]

  // Coloca la lista debajo del botón, o encima si no cabe.
  const place = useCallback(() => {
    const r = btn.current.getBoundingClientRect()
    const wanted = Math.min(288, options.length * 40 + 12)
    const below = window.innerHeight - r.bottom - 12
    const up = below < wanted && r.top > below
    setPos({
      left: r.left,
      width: r.width,
      top: up ? undefined : r.bottom + 6,
      bottom: up ? window.innerHeight - r.top + 6 : undefined,
      maxHeight: Math.min(288, up ? r.top - 16 : below),
    })
  }, [options.length])

  const openList = () => {
    place()
    setActive(Math.max(0, selectedIndex))
    setOpen(true)
  }

  const close = useCallback((focus = true) => {
    setOpen(false)
    if (focus) btn.current?.focus()
  }, [])

  const choose = (i) => {
    onChange(options[i].value)
    close()
  }

  // Cerrar al pulsar fuera, al hacer scroll en la página o al cambiar el tamaño.
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (!btn.current?.contains(e.target) && !list.current?.contains(e.target)) close(false)
    }
    const onScroll = (e) => {
      if (!list.current?.contains(e.target)) close(false)
    }
    const onResize = () => close(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open, close])

  // Mantener visible la opción activa (útil en la lista de horas).
  // Solo mueve el scroll interno de la lista, nunca el de la página.
  useLayoutEffect(() => {
    const box = list.current
    const el = box?.querySelector('[data-active="true"]')
    if (!el) return
    if (el.offsetTop < box.scrollTop) box.scrollTop = el.offsetTop - 6
    else if (el.offsetTop + el.offsetHeight > box.scrollTop + box.clientHeight)
      box.scrollTop = el.offsetTop + el.offsetHeight - box.clientHeight + 6
  }, [open, active])

  function onKeyDown(e) {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        openList()
      }
      return
    }
    const last = options.length - 1
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(last, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActive(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActive(last)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      choose(active)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation() // que no cierre también la ventana modal
      close()
    } else if (e.key === 'Tab') {
      close(false)
    } else if (e.key.length === 1) {
      const ch = e.key.toLowerCase()
      const order = [...options.keys()].map((k) => (active + 1 + k) % options.length)
      const hit = order.find((i) => String(options[i].label).toLowerCase().startsWith(ch))
      if (hit !== undefined) setActive(hit)
    }
  }

  return (
    <>
      <button
        type="button"
        ref={btn}
        className="select-btn"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${uid}-opt-${active}` : undefined}
        aria-label={label}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
      >
        <span className={`select-value ${selected ? '' : 'is-placeholder'}`}>
          {selected ? selected.label : placeholder}
        </span>
        {selected?.hint && <span className="select-hint">{selected.hint}</span>}
        <svg className="select-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <path d="M3 4.5l3 3 3-3" />
        </svg>
      </button>

      {open && pos &&
        createPortal(
          <ul
            ref={list}
            id={listId}
            role="listbox"
            aria-label={label}
            className="select-list"
            style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight }}
          >
            {options.map((o, i) => (
              <li
                key={String(o.value)}
                id={`${uid}-opt-${i}`}
                role="option"
                aria-selected={i === selectedIndex}
                data-active={i === active}
                className="select-opt"
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
              >
                <span className="select-opt-label">{o.label}</span>
                {o.hint && <span className="select-opt-hint">{o.hint}</span>}
                <span className="select-opt-check">{i === selectedIndex && <IconCheck size={15} />}</span>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  )
}
