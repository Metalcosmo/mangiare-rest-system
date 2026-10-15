import type { Payload } from 'payload'

import { idNumero } from './ids'

/**
 * Identidad de una mesa abierta desde el código QR.
 *
 * La sesión es el candado de la mesa (quién puede pedir) y el agrupador de
 * rondas; la **cuenta** es la mesa. Nada se cobra por sesión.
 */

export type RolMesa = 'anfitrion' | 'invitado'

export type SesionMesa = {
  id: string | number
  mesa?: unknown
  anfitrionNombre?: string | null
  anfitrionCedula?: string | null
  tokenAnfitrion?: string | null
  tokenInvitado?: string | null
  estado?: string | null
  origen?: string | null
  abiertaEn?: string | null
  cerradaEn?: string | null
  motivoCierre?: string | null
}

/** Mayúsculas y sólo letras o dígitos: `V-12.345.678` → `V12345678`. */
export const normalizarCedula = (valor: string | null | undefined): string =>
  (valor ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 20)

export const normalizarNombre = (valor: string | null | undefined): string =>
  (valor ?? '').trim().replace(/\s+/g, ' ').slice(0, 80)

/** Valida la identidad del anfitrión. Devuelve el error a mostrar, o `null`. */
export function validarIdentidad(entrada: {
  nombre?: string | null
  cedula?: string | null
}): string | null {
  const nombre = normalizarNombre(entrada.nombre)
  if (nombre.length < 2) return 'Escribe tu nombre.'

  const cedula = normalizarCedula(entrada.cedula)
  if (cedula.length < 5) return 'Escribe una cédula válida.'

  return null
}

/** Sesión abierta canónica de una mesa: la más antigua, para no partir la cuenta. */
export async function sesionAbiertaDeMesa(
  payload: Payload,
  mesaId: string | number,
): Promise<SesionMesa | null> {
  const { docs } = await payload.find({
    collection: 'sesiones-mesa',
    where: { mesa: { equals: idNumero(mesaId) }, estado: { equals: 'abierta' } },
    sort: 'id',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  return (docs[0] as unknown as SesionMesa) ?? null
}

/** ¿La cédula escrita corresponde al anfitrión de la sesión? */
export const coincideCedula = (
  sesion: Pick<SesionMesa, 'anfitrionCedula'>,
  cedula: string | null | undefined,
): boolean => {
  const esperada = normalizarCedula(sesion.anfitrionCedula)
  const recibida = normalizarCedula(cedula)
  return esperada.length > 0 && esperada === recibida
}

/** Rol que corresponde a un token guardado en la cookie. */
export function rolDeToken(sesion: SesionMesa, token: string | null | undefined): RolMesa | null {
  if (!token) return null
  if (sesion.tokenAnfitrion && token === sesion.tokenAnfitrion) return 'anfitrion'
  if (sesion.tokenInvitado && token === sesion.tokenInvitado) return 'invitado'
  return null
}

/**
 * Abre la mesa. Si ya hay una sesión abierta no la toca: sólo avisa, para que
 * nadie cierre la sesión de otra persona.
 */
export async function abrirSesion(
  payload: Payload,
  entrada: {
    mesa: string | number
    nombre: string
    cedula: string
    origen?: 'cliente' | 'mesero'
  },
): Promise<{ sesion?: SesionMesa; error?: string }> {
  const error = validarIdentidad(entrada)
  if (error) return { error }

  const existente = await sesionAbiertaDeMesa(payload, entrada.mesa)
  if (existente) return { error: 'Alguien más abrió esta mesa justo antes.' }

  const sesion = (await payload.create({
    collection: 'sesiones-mesa',
    overrideAccess: true,
    data: {
      mesa: idNumero(entrada.mesa),
      anfitrionNombre: normalizarNombre(entrada.nombre),
      anfitrionCedula: normalizarCedula(entrada.cedula),
      tokenAnfitrion: crypto.randomUUID(),
      tokenInvitado: crypto.randomUUID(),
      estado: 'abierta',
      origen: entrada.origen ?? 'cliente',
      abiertaEn: new Date().toISOString(),
    } as never,
  })) as unknown as SesionMesa

  await marcarMesaOcupada(payload, entrada.mesa)

  return { sesion }
}

/**
 * Abre la mesa desde el POS. La sesión nace **sin cédula**: el mesero no la
 * conoce, y el primer comensal que escanee el QR la reclama.
 */
export async function abrirSesionDeMesero(
  payload: Payload,
  entrada: { mesa: string | number; nombre: string },
): Promise<{ sesion?: SesionMesa; error?: string }> {
  const existente = await sesionAbiertaDeMesa(payload, entrada.mesa)
  if (existente) return { sesion: existente }

  const sesion = (await payload.create({
    collection: 'sesiones-mesa',
    overrideAccess: true,
    data: {
      mesa: idNumero(entrada.mesa),
      anfitrionNombre: normalizarNombre(entrada.nombre) || 'Mesero',
      tokenAnfitrion: crypto.randomUUID(),
      tokenInvitado: crypto.randomUUID(),
      estado: 'abierta',
      origen: 'mesero',
      abiertaEn: new Date().toISOString(),
    } as never,
  })) as unknown as SesionMesa

  await marcarMesaOcupada(payload, entrada.mesa)

  return { sesion }
}

/**
 * Le pone identidad a una sesión que abrió el mesero desde el POS: esa sesión
 * no tiene cédula, así que el primer comensal que llegue la reclama.
 */
export async function reclamarSesion(
  payload: Payload,
  sesion: SesionMesa,
  entrada: { nombre: string; cedula: string },
): Promise<{ sesion?: SesionMesa; error?: string }> {
  if (sesion.anfitrionCedula) {
    return { error: 'Esta mesa ya tiene anfitrión.' }
  }

  const error = validarIdentidad(entrada)
  if (error) return { error }

  const actualizada = (await payload.update({
    collection: 'sesiones-mesa',
    id: idNumero(sesion.id),
    overrideAccess: true,
    data: {
      anfitrionNombre: normalizarNombre(entrada.nombre),
      anfitrionCedula: normalizarCedula(entrada.cedula),
      origen: 'cliente',
    } as never,
  })) as unknown as SesionMesa

  return { sesion: { ...actualizada, tokenAnfitrion: sesion.tokenAnfitrion } }
}

/** Deja la mesa ocupada, salvo que ya esté en otro estado operativo. */
async function marcarMesaOcupada(payload: Payload, mesaId: string | number): Promise<void> {
  try {
    const mesa = (await payload.findByID({
      collection: 'mesas',
      id: idNumero(mesaId),
      depth: 0,
      overrideAccess: true,
    })) as { estado?: string | null } | null

    if (!mesa || mesa.estado === 'ocupada') return
    // Una mesa fuera de servicio o en limpieza no se marca como ocupada.
    if (mesa.estado !== 'libre' && mesa.estado !== 'reservada') return

    await payload.update({
      collection: 'mesas',
      id: idNumero(mesaId),
      data: { estado: 'ocupada' } as never,
      overrideAccess: true,
    })
  } catch {
    // El estado de la mesa es cosmético: si falla, la sesión ya quedó abierta.
  }
}
