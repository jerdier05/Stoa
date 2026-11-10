import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { onNotify } from '../lib/notify'
import { IconCheck, IconX } from './icons'

/**
 * Diálogo de confirmación y avisos (toasts) con el estilo de Stoa.
 *
 *   const { confirm, toast } = useFeedback()
 *   if (await confirm({ title: '¿Borrar?', message: '…', confirmLabel: 'Borrar', danger: true })) { … }
 *   toast('Guardado', 'ok')
 */
const FeedbackContext = createContext(null)
export const useFeedback = () => useContext(FeedbackContext)

let nextId = 1

export function FeedbackProvider({ children }) {
  const [dialog, setDialog] = useState(null)
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'ok') => {
    const id = nextId++
    setToasts((t) => [...t.filter((x) => x.message !== message), { id, message, type }].slice(-3))
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), type === 'error' ? 5000 : 2800)
  }, [])

  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        setDialog({ ...opts, resolve })
      }),
    [],
  )

  // Errores avisados desde cualquier parte (hooks de datos, etc.).
  useEffect(() => onNotify(({ message, type }) => toast(message, type)), [toast])

  // Errores ya avisados que nadie ha capturado: no ensuciar la consola.
  useEffect(() => {
    const onRejection = (e) => e.reason?.notified && e.preventDefault()
    window.addEventListener('unhandledrejection', onRejection)
    return () => window.removeEventListener('unhandledrejection', onRejection)
  }, [])

  const answer = (value) => {
    dialog?.resolve(value)
    setDialog(null)
  }

  return (
    <FeedbackContext.Provider value={{ confirm, toast }}>
      {children}
      {dialog && <ConfirmDialog {...dialog} onAnswer={answer} />}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span className="toast-icon" aria-hidden="true">
              {t.type === 'error' ? <IconX size={14} /> : <IconCheck size={14} />}
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  )
}

function ConfirmDialog({ title, message, confirmLabel = 'Aceptar', cancelLabel = 'Cancelar', danger, onAnswer }) {
  const okRef = useRef(null)
  const cancelRef = useRef(null)

  useEffect(() => {
    // En acciones peligrosas el foco empieza en "Cancelar".
    ;(danger ? cancelRef : okRef).current?.focus()
  }, [danger])

  return (
    <div className="backdrop backdrop-top" onMouseDown={(e) => e.target === e.currentTarget && onAnswer(false)}>
      <div
        className="modal confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={message ? 'confirm-msg' : undefined}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation()
            onAnswer(false)
          }
        }}
      >
        <h3 id="confirm-title" className="confirm-title">{title}</h3>
        {message && <p id="confirm-msg" className="confirm-msg">{message}</p>}
        <div className="confirm-actions">
          <button type="button" ref={cancelRef} className="btn btn-outline" onClick={() => onAnswer(false)}>
            {cancelLabel}
          </button>
          <button type="button" ref={okRef} className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => onAnswer(true)}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
