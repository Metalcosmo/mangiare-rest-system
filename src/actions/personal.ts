'use server'

import { revalidatePath } from 'next/cache'

import { usuarioActual } from '@/lib/auth'
import { getPayloadClient } from '@/lib/payload'
import { esEstadoTurno, ETIQUETA_TURNO } from '@/lib/personal'

export type EstadoAccionPersonal = {
  ok?: boolean
  error?: string
  mensaje?: string
}

/**
 * Cambia el estado de un turno (programado → confirmado → completado / ausente).
 * Se ejecuta como el usuario de la sesión, respetando los permisos de la colección.
 */
export async function cambiarEstadoTurno(
  id: string | number,
  estado: string,
): Promise<EstadoAccionPersonal> {
  if (!esEstadoTurno(estado)) return { error: 'Estado de turno no válido.' }

  const usuario = await usuarioActual()
  if (!usuario) return { error: 'Tu sesión expiró. Vuelve a entrar.' }

  const payload = await getPayloadClient()

  try {
    await payload.update({
      collection: 'turnos',
      id,
      data: { estado },
      overrideAccess: false,
      user: usuario as never,
    })
  } catch {
    return { error: 'No pudimos actualizar el turno.' }
  }

  revalidatePath('/panel/personal')
  return { ok: true, mensaje: `Turno marcado como ${ETIQUETA_TURNO[estado].toLowerCase()}.` }
}
