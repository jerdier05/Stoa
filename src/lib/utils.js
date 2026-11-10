export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
export const DAYS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

// JavaScript empieza la semana en domingo (0); nosotros en lunes (0).
export const dayIndex = (d = new Date()) => (d.getDay() + 6) % 7

// Fecha local en formato AAAA-MM-DD (el que usa la columna "date" de Postgres).
export const toISODate = (d = new Date()) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

export const addDays = (d, n) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export const fromISO = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const fmtTime = (min) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

export const fmtDuration = (min) => {
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

// Tramos de 30 minutos: 00:00, 00:30 … 24:00
export const TIME_OPTIONS = Array.from({ length: 49 }, (_, i) => i * 30)

export const nowMinutes = () => {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

export const eur = (n, decimals = 0) =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(n) || 0)

export const longDate = (d = new Date()) =>
  new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(d)

export const monthName = (d) =>
  new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(d)

export const toNumber = (v) => (v === '' || v == null ? null : Number(String(v).replace(',', '.')))

export const greeting = () => {
  const h = new Date().getHours()
  if (h < 6) return 'Buenas noches'
  if (h < 14) return 'Buenos días'
  if (h < 21) return 'Buenas tardes'
  return 'Buenas noches'
}
