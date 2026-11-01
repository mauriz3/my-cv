/**
 * «Datos actualizados hace 3 h» / «Data updated 3 h ago»: antigüedad de la instantánea de visitas.
 * Lógica pura (sin reloj propio: `now` entra por parámetro) y textos ES/EN con plural.
 */

const MS_PER_MINUTE = 60_000
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24

export type AgeUnit = 'now' | 'minute' | 'hour' | 'day'
export interface Age {
  unit: AgeUnit
  count: number
}

/** Unidad mayor que cabe entera: < 1 min → «ahora»; < 60 min → minutos; < 24 h → horas; si no, días. Fechas futuras (reloj desfasado) → «ahora». */
export function ageOf(updatedAt: Date, now: Date): Age {
  const minutes = Math.floor((now.getTime() - updatedAt.getTime()) / MS_PER_MINUTE)
  if (!Number.isFinite(minutes) || minutes < 1) return { unit: 'now', count: 0 }
  if (minutes < MINUTES_PER_HOUR) return { unit: 'minute', count: minutes }
  const hours = Math.floor(minutes / MINUTES_PER_HOUR)
  if (hours < HOURS_PER_DAY) return { unit: 'hour', count: hours }
  return { unit: 'day', count: Math.floor(hours / HOURS_PER_DAY) }
}

export type UpdatedAgoLocale = 'en' | 'es'

const MESSAGES: Record<UpdatedAgoLocale, Record<AgeUnit, (count: number) => string>> = {
  es: {
    now: () => 'Datos actualizados hace un momento',
    minute: (count) => `Datos actualizados hace ${count} min`,
    hour: (count) => `Datos actualizados hace ${count} h`,
    day: (count) => `Datos actualizados hace ${count} ${count === 1 ? 'día' : 'días'}`,
  },
  en: {
    now: () => 'Data updated just now',
    minute: (count) => `Data updated ${count} min ago`,
    hour: (count) => `Data updated ${count} h ago`,
    day: (count) => `Data updated ${count} ${count === 1 ? 'day' : 'days'} ago`,
  },
}

export function formatUpdatedAgo(updatedAt: string | Date, now: Date, locale: UpdatedAgoLocale): string {
  const { unit, count } = ageOf(new Date(updatedAt), now)
  return MESSAGES[locale][unit](count)
}
