// Pequeño "bus" de avisos: cualquier parte de la app puede avisar de un
// error y el componente <Feedback> lo muestra en pantalla.
const listeners = new Set()

export function onNotify(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function notify(message, type = 'error') {
  listeners.forEach((fn) => fn({ message, type }))
}

// Traduce los errores técnicos a mensajes comprensibles.
export function friendlyError(error) {
  const msg = String(error?.message || error || '')
  if (/failed to fetch|network|load failed/i.test(msg)) return 'Sin conexión. No se ha podido guardar.'
  if (/jwt|token|not authenticated/i.test(msg)) return 'Tu sesión ha caducado. Vuelve a iniciar sesión.'
  if (/duplicate key|already exists/i.test(msg)) return 'Eso ya existe.'
  if (/violates check constraint/i.test(msg)) return 'Algún dato no es válido. Revisa los campos.'
  if (/row-level security/i.test(msg)) return 'No tienes permiso para hacer eso.'
  return 'Algo ha fallado. Inténtalo de nuevo.'
}

/** Avisa del error una sola vez y lo devuelve marcado. */
export function reportError(error) {
  if (error && !error.notified) {
    notify(friendlyError(error))
    try {
      error.notified = true
    } catch {
      /* objeto congelado */
    }
  }
  return error
}
