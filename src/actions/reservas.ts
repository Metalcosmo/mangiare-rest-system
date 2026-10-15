'use server'

import { revalidatePath } from 'next/cache'

import type { EstadoAccion } from '@/actions/crud'
import { usuarioActual } from '@/lib/auth'
import { getPayloadClient } from '@/lib/payload'

/** Estados posibles de una reservación. */
export type EstadoReservacion =
  | 'pendiente'
  | 'confirmada'
  | 'sentada'
  | 'completada'
  | 'cancelada'
  | 'no_asistio'

const ESTADOS_RESERVACION: EstadoReservacion[] = [
  'pendiente',
  'confirmada',
  'sentada',
  'completada',
  'cancelada',
  'no_asistio',
]

const ETIQUETA_RESERVACION: Record<EstadoReservacion, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  sentada: 'cliente en mesa',
  completada: 'Completada',
  cancelada: 'Cancelada',
  no_asistio: 'No se presentó',
}

/** Las tablas SQLite usan identificadores numéricos; los respetamos. */
const aId = (valor: string | number): string | number => {
  if (typeof valor === 'number') return valor
  return /^\d+$/.test(valor) ? Number(valor) : valor
}

/**
 * Cambia el estado de una reservación.
 *
 * Al pasar a `sentada` la colección marca la mesa como ocupada mediante su
 * propio hook del servidor, por lo que aquí no se toca la mesa.
 */
export async function cambiarEstadoReservacion(
  id: string | number,
  estado: EstadoReservacion,
): Promise<EstadoAccion> {
  if (!ESTADOS_RESERVACION.includes(estado)) {
    return { error: 'Estado de reservación no válido.' }
  }

  const usuario = await usuarioActual()
  if (!usuario) return { error: 'Tu sesión expiró. Vuelve a entrar.' }

  const payload = await getPayloadClient()

  try {
    await payload.update({
      collection: 'reservaciones',
      id: aId(id),
      data: { estado } as never,
      overrideAccess: false,
      user: usuario as never,
    })
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : 'No pudimos actualizar la reservación.'
    return { error: mensaje }
  }

  revalidatePath('/panel/reservas')
  return {
    ok: true,
    mensaje: `Reservación marcada como ${ETIQUETA_RESERVACION[estado]}.`,
  }
}

/** Asigna (o quita) la mesa de una reservación. */
export async function asignarMesa(
  id: string | number,
  mesaId: string | number | null,
): Promise<EstadoAccion> {
  const usuario = await usuarioActual()
  if (!usuario) return { error: 'Tu sesión expiró. Vuelve a entrar.' }

  const payload = await getPayloadClient()

  try {
    await payload.update({
      collection: 'reservaciones',
      id: aId(id),
      data: { mesa: mesaId === null || mesaId === '' ? null : aId(mesaId) } as never,
      overrideAccess: false,
      user: usuario as never,
    })
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'No pudimos asignar la mesa.'
    return { error: mensaje }
  }

  revalidatePath('/panel/reservas')
  return {
    ok: true,
    mensaje: mesaId === null || mesaId === '' ? 'Mesa liberada.' : 'Mesa asignada.',
  }
}
