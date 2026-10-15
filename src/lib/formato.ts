import type { Ajustes } from './payload'

const MONEDAS: Record<string, string> = {
  MXN: 'es-MX',
  COP: 'es-CO',
  ARS: 'es-AR',
  EUR: 'es-ES',
  USD: 'en-US',
  PEN: 'es-PE',
  CLP: 'es-CL',
}

export const localeDe = (ajustes?: Pick<Ajustes, 'moneda'> | null): string =>
  MONEDAS[ajustes?.moneda ?? 'MXN'] ?? 'es-MX'

/** Importe con el símbolo configurado en los ajustes del restaurante. */
export function moneda(valor: number | null | undefined, ajustes?: Ajustes | null): string {
  const numero = Number(valor ?? 0)
  const simbolo = ajustes?.simboloMoneda ?? '$'
  const formateado = new Intl.NumberFormat(localeDe(ajustes), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numero)
  return `${simbolo}${formateado}`
}

/** Versión compacta para tableros: $1.2k */
export function monedaCorta(valor: number | null | undefined, ajustes?: Ajustes | null): string {
  const numero = Number(valor ?? 0)
  const simbolo = ajustes?.simboloMoneda ?? '$'
  if (Math.abs(numero) >= 1000) {
    return `${simbolo}${(numero / 1000).toFixed(1)}k`
  }
  return `${simbolo}${numero.toFixed(0)}`
}

export const numero = (valor: number | null | undefined, decimales = 0): string =>
  new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(Number(valor ?? 0))

export const porcentaje = (valor: number | null | undefined): string =>
  `${(Number(valor ?? 0) * 100).toFixed(0)}%`

const aFecha = (valor: unknown): Date | null => {
  if (!valor) return null
  const fecha = valor instanceof Date ? valor : new Date(String(valor))
  return Number.isNaN(fecha.getTime()) ? null : fecha
}

export function fecha(valor: unknown, opciones?: Intl.DateTimeFormatOptions): string {
  const f = aFecha(valor)
  if (!f) return '—'
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...opciones,
  }).format(f)
}

export function fechaHora(valor: unknown): string {
  const f = aFecha(valor)
  if (!f) return '—'
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(f)
}

export function hora(valor: unknown): string {
  const f = aFecha(valor)
  if (!f) return '—'
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(f)
}

/** Hora corta a partir de un texto "HH:mm". */
export const hhmm = (valor?: string | null): string => (valor ? valor.slice(0, 5) : '—')

/** Minutos transcurridos desde una fecha, para los temporizadores del KDS. */
export function minutosDesde(valor: unknown, ahora: number = Date.now()): number {
  const f = aFecha(valor)
  if (!f) return 0
  return Math.max(0, Math.floor((ahora - f.getTime()) / 60000))
}

export const iniciales = (nombre?: string | null): string =>
  (nombre ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('') || '?'

export const DIAS_SEMANA = [
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
] as const
