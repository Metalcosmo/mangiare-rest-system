/**
 * Metadatos de color de los estados de mesa.
 *
 * Es un módulo neutro (sin `'use client'`): lo consume la leyenda desde el
 * servidor y el mapa desde el cliente. Los valores no se pueden exportar desde
 * un módulo cliente porque el servidor sólo recibe referencias de componentes.
 */

export type EstadoMesa = 'libre' | 'ocupada' | 'reservada' | 'limpieza' | 'fuera_servicio'

export type MetaEstadoMesa = {
  estado: EstadoMesa
  etiqueta: string
  /** Punto de color para la leyenda. */
  punto: string
  /** Caja completa de la mesa en el mapa. */
  caja: string
}

export const ESTADOS_MESA: MetaEstadoMesa[] = [
  {
    estado: 'libre',
    etiqueta: 'Libre',
    punto: 'bg-emerald-500',
    caja: 'border-emerald-500/70 bg-emerald-500/15 text-emerald-950 hover:bg-emerald-500/25 dark:text-emerald-50',
  },
  {
    estado: 'ocupada',
    etiqueta: 'Ocupada',
    punto: 'bg-destructive',
    caja: 'border-destructive/70 bg-destructive/15 text-destructive hover:bg-destructive/25',
  },
  {
    estado: 'reservada',
    etiqueta: 'Reservada',
    punto: 'bg-violet-500',
    caja: 'border-violet-500/70 bg-violet-500/15 text-violet-950 hover:bg-violet-500/25 dark:text-violet-50',
  },
  {
    estado: 'limpieza',
    etiqueta: 'Por limpiar',
    punto: 'bg-amber-500',
    caja: 'border-amber-500/70 bg-amber-500/15 text-amber-950 hover:bg-amber-500/25 dark:text-amber-50',
  },
  {
    estado: 'fuera_servicio',
    etiqueta: 'Fuera de servicio',
    punto: 'bg-muted-foreground',
    caja: 'border-border bg-muted text-muted-foreground hover:bg-muted/80',
  },
]

/** Estilo del borde/fondo de cada estado, indexado por su clave. */
export const CAJA_ESTADO: Record<string, string> = ESTADOS_MESA.reduce(
  (mapa, meta) => {
    mapa[meta.estado] = meta.caja
    return mapa
  },
  {} as Record<string, string>,
)

/** Etiqueta legible de cada estado, para textos y leyendas. */
export const ETIQUETA_ESTADO_MESA: Record<string, string> = ESTADOS_MESA.reduce(
  (mapa, meta) => {
    mapa[meta.estado] = meta.etiqueta
    return mapa
  },
  {} as Record<string, string>,
)

/** Posición y silueta por forma de mesa en el plano. */
export const FORMA_MESA: Record<string, string> = {
  cuadrada: 'h-20 w-20 rounded-lg',
  redonda: 'h-20 w-20 rounded-full',
  rectangular: 'h-16 w-28 rounded-lg',
  barra: 'h-12 w-32 rounded-lg',
}

/** Nombre legible de cada forma de mesa. */
export const ETIQUETA_FORMA: Record<string, string> = {
  cuadrada: 'Cuadrada',
  redonda: 'Redonda',
  rectangular: 'Rectangular',
  barra: 'Barra',
}
