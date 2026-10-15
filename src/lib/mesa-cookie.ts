import { cookies } from 'next/headers'

import { rolDeToken, sesionAbiertaDeMesa, type RolMesa, type SesionMesa } from './mesa-sesion'
import { getPayloadClient } from './payload'

/**
 * Cookie que identifica al comensal dentro de la sesión de una mesa.
 *
 * El valor es `<sesionId>.<token>`. El rol no viaja en la cookie: se deduce de
 * comparar el token contra los dos secretos de la sesión, así que un invitado
 * no puede reemitir su cookie como anfitrión ni leyéndola desde el navegador.
 */

const NOMBRE = 'mg_mesa'
const DOCE_HORAS = 60 * 60 * 12

type CookieMesa = { sesion: SesionMesa; rol: RolMesa }

export async function escribirMesa(sesion: SesionMesa, rol: RolMesa): Promise<void> {
  const token = rol === 'anfitrion' ? sesion.tokenAnfitrion : sesion.tokenInvitado
  if (!token) return

  const almacen = await cookies()
  almacen.set(NOMBRE, `${sesion.id}.${token}`, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: DOCE_HORAS,
  })
}

export async function borrarMesa(): Promise<void> {
  const almacen = await cookies()
  almacen.delete(NOMBRE)
}

/**
 * Lee la cookie y la resuelve contra la sesión abierta de la mesa.
 * Devuelve `null` si la cookie es de otra mesa, de otra cuenta o de una sesión
 * que ya se cerró.
 */
export async function leerMesa(mesaId: string | number): Promise<CookieMesa | null> {
  const almacen = await cookies()
  const crudo = almacen.get(NOMBRE)?.value
  if (!crudo) return null

  const separador = crudo.indexOf('.')
  if (separador <= 0) return null

  const id = crudo.slice(0, separador)
  const token = crudo.slice(separador + 1)

  const numero = Number(id)
  if (!Number.isFinite(numero)) return null

  const payload = await getPayloadClient()

  // La sesión guardada en la cookie tiene que seguir siendo la que manda en la
  // mesa: si se cerró y alguien abrió otra, esta cookie ya no sirve.
  const vigente = await sesionAbiertaDeMesa(payload, mesaId)
  if (!vigente || String(vigente.id) !== id) return null

  const rol = rolDeToken(vigente, token)
  if (!rol) return null

  return { sesion: vigente, rol }
}
