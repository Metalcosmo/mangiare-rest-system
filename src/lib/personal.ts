/**
 * Constantes y utilidades de personal compartidas entre servidor y cliente.
 * No importar aquí nada de `next/headers` ni de la Local API de Payload.
 */

/** Estados válidos de un turno (coinciden con la colección `turnos`). */
export const ESTADOS_TURNO = ['programado', 'confirmado', 'completado', 'ausente'] as const

export type EstadoTurno = (typeof ESTADOS_TURNO)[number]

/** Etiquetas en español de cada estado de turno. */
export const ETIQUETA_TURNO: Record<EstadoTurno, string> = {
  programado: 'Programado',
  confirmado: 'Confirmado',
  completado: 'Completado',
  ausente: 'Ausente',
}

export const esEstadoTurno = (valor: string): valor is EstadoTurno =>
  (ESTADOS_TURNO as readonly string[]).includes(valor)

/** Roles del sistema con su etiqueta legible (versión cliente-safe). */
export const ROLES_EMPLEADO = [
  { value: 'admin', label: 'Administrador' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'cajero', label: 'Cajero' },
  { value: 'mesero', label: 'Mesero' },
  { value: 'cocina', label: 'Cocina' },
] as const

export const etiquetaRol = (rol?: string | null): string =>
  ROLES_EMPLEADO.find((r) => r.value === rol)?.label ?? (rol || '—')
