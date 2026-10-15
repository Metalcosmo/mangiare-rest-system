/**
 * Constantes compartidas del módulo CRM: etiquetas de cliente y ayudas de
 * presentación. Es data pura; se puede importar desde servidor y cliente.
 */

/** Etiquetas de cliente declaradas en la colección `clientes`. */
export const ETIQUETAS_CLIENTE = [
  { label: 'VIP', value: 'vip' },
  { label: 'Frecuente', value: 'frecuente' },
  { label: 'Nuevo', value: 'nuevo' },
  { label: 'Inactivo', value: 'inactivo' },
  { label: 'Cumpleaños este mes', value: 'cumpleanos' },
  { label: 'Corporativo', value: 'corporativo' },
  { label: 'Delivery', value: 'delivery' },
] as const

/** Valor centinela para el filtro "todos" (Radix no admite cadenas vacías). */
export const TODOS = '__todos__'

const MAPA_ETIQUETAS: Record<string, string> = ETIQUETAS_CLIENTE.reduce(
  (mapa, etiqueta) => ({ ...mapa, [etiqueta.value]: etiqueta.label }),
  {},
)

/** Nombre legible de una etiqueta de cliente. */
export const etiquetaCliente = (valor: string): string => MAPA_ETIQUETAS[valor] ?? valor
