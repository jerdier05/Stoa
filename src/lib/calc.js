import { addDays, dayIndex, toISODate } from './utils'

/**
 * Racha de entrenamientos: días seguidos marcados como hechos.
 * Los días sin ejercicios en tu rutina son descanso y no la rompen.
 * Hoy tampoco la rompe todavía: aún puedes entrenar.
 */
export function computeStreak(doneDates, plannedDays) {
  let streak = 0
  for (let i = 0; i < 400; i++) {
    const d = addDays(new Date(), -i)
    if (doneDates.has(toISODate(d))) {
      streak++
      continue
    }
    if (i === 0) continue
    const planned = plannedDays.size === 0 || plannedDays.has(dayIndex(d))
    if (!planned) continue
    break
  }
  return streak
}

/**
 * Objetivos diarios con la fórmula de Mifflin-St Jeor.
 * Proteína 2 g/kg, grasa 0,9 g/kg y el resto de calorías en carbohidratos.
 */
export function nutritionTargets(s) {
  if (!s?.weight || !s?.height || !s?.age || !s?.sex) return null
  const weight = Number(s.weight)
  const bmr = 10 * weight + 6.25 * Number(s.height) - 5 * Number(s.age) + (s.sex === 'm' ? 5 : -161)
  const adjust = { lose: -400, keep: 0, gain: 300 }[s.goal || 'keep']
  const kcal = Math.round(bmr * Number(s.activity || 1.55) + adjust)
  const protein = Math.round(weight * 2)
  const fat = Math.round(weight * 0.9)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return {
    kcal,
    protein,
    fat,
    carbs,
    fiber: Math.round((kcal / 1000) * 14),
    water: Math.round(weight * 0.035 * 10) / 10,
  }
}

/** Interés compuesto mensual, devuelto año a año. */
export function projectInvestment({ start, monthly, rate, years }) {
  const out = []
  let value = Number(start) || 0
  let contributed = value
  const r = (Number(rate) || 0) / 100 / 12
  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      value = value * (1 + r) + monthly
      contributed += monthly
    }
    out.push({ year: y, value, contributed })
  }
  return out
}
