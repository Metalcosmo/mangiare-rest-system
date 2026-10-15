/**
 * Constantes de marketing compartidas entre servidor y cliente.
 * No importar aquí nada de `next/headers` ni de la Local API de Payload.
 */

/** Segmentos de audiencia soportados por las campañas. */
export const SEGMENTOS_AUDIENCIA = [
  'todos',
  'vip',
  'frecuente',
  'inactivo',
  'cumpleanos',
  'nuevo',
] as const

export type SegmentoAudiencia = (typeof SEGMENTOS_AUDIENCIA)[number]

export const ETIQUETA_SEGMENTO: Record<SegmentoAudiencia, string> = {
  todos: 'Todos los clientes',
  vip: 'VIP',
  frecuente: 'Frecuentes',
  inactivo: 'Inactivos (+60 días)',
  cumpleanos: 'Cumpleaños del mes',
  nuevo: 'Nuevos (1 visita)',
}

/** Criterio explicado de cada segmento, para mostrarlo en la interfaz. */
export const CRITERIO_SEGMENTO: Record<SegmentoAudiencia, string> = {
  todos: 'Todos los clientes registrados.',
  vip: 'Clientes con la etiqueta «VIP».',
  frecuente: 'Clientes con la etiqueta «Frecuente».',
  inactivo: 'Sin visitar el restaurante desde hace más de 60 días.',
  cumpleanos: 'Clientes que cumplen años durante el mes en curso.',
  nuevo: 'Clientes con una visita o menos.',
}

export const CANALES_CAMPANA = [
  { value: 'email', label: 'Correo electrónico' },
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'push', label: 'Push' },
] as const

export const etiquetaCanal = (canal?: string | null): string =>
  CANALES_CAMPANA.find((c) => c.value === canal)?.label ?? (canal || '—')

/** Tonos (clases de Tailwind) para el badge de cada canal. */
export const TONO_CANAL: Record<string, string> = {
  email: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  sms: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  whatsapp: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  push: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
}
