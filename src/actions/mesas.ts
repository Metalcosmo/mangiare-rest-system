'use server'

import { revalidatePath } from 'next/cache'
import type { Where } from 'payload'

import { escribirMesa } from '@/lib/mesa-cookie'
import {
  abrirSesion,
  coincideCedula,
  reclamarSesion,
  sesionAbiertaDeMesa,
  type SesionMesa,
} from '@/lib/mesa-sesion'
import { getPayloadClient } from '@/lib/payload'

/**
 * Puerta de identidad de la carta pública.
 *
 * - Abrir la mesa: el primero que escanea deja su nombre y su cédula.
 * - Unirse: los demás escriben la cédula del anfitrión.
 * - Reclamar: la mesa la abrió el personal desde el POS y aún no tiene
 *   anfitrión; el primer comensal que llegue la reclama.
 */

export type EstadoPuerta = {
  ok?: boolean
  error?: string
  anfitrionNombre?: string
}

/** Mensaje único: no revela si la mesa existe, si está abierta ni quién la abrió. */
const NO_COINCIDE = 'La cédula no coincide con quien abrió la mesa.'

type MesaCruda = {
  id: string | number
  nombre?: string | null
  slug?: string | null
  estado?: string | null
  activa?: boolean | null
}

async function mesaPorSlug(slug: string): Promise<MesaCruda | null> {
  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'mesas',
    where: { slug: { equals: slug }, activa: { equals: true } } as Where,
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })

  return (docs[0] as unknown as MesaCruda) ?? null
}

/** La mesa tiene que existir y estar en servicio para dejar entrar a alguien. */
async function resolverMesa(
  slug: string | undefined,
): Promise<{ mesa?: MesaCruda; error?: string }> {
  if (!slug) return { error: 'No pudimos identificar tu mesa. Vuelve a escanear el código QR.' }

  const mesa = await mesaPorSlug(slug)
  if (!mesa) return { error: 'Esta mesa no está disponible. Pide ayuda al personal.' }
  if (mesa.estado === 'fuera_servicio') {
    return { error: 'Esta mesa no está en servicio. Pide ayuda al personal.' }
  }

  return { mesa }
}

const refrescar = (slug: string) => revalidatePath(`/mesa/${slug}`)

/** Abre la mesa: el comensal queda como anfitrión. */
export async function abrirSesionMesa(
  _prev: EstadoPuerta,
  formData: FormData,
): Promise<EstadoPuerta> {
  const slug = formData.get('mesaSlug')?.toString()?.trim()
  const { mesa, error } = await resolverMesa(slug)
  if (error || !mesa) return { error }

  const payload = await getPayloadClient()

  const resultado = await abrirSesion(payload, {
    mesa: mesa.id,
    nombre: formData.get('nombre')?.toString() ?? '',
    cedula: formData.get('cedula')?.toString() ?? '',
  })

  if (resultado.error || !resultado.sesion) return { error: resultado.error }

  await escribirMesa(resultado.sesion, 'anfitrion')
  refrescar(slug!)

  return { ok: true, anfitrionNombre: resultado.sesion.anfitrionNombre ?? undefined }
}

/** Se une a la mesa escribiendo la cédula del anfitrión. */
export async function unirSesionMesa(
  _prev: EstadoPuerta,
  formData: FormData,
): Promise<EstadoPuerta> {
  const slug = formData.get('mesaSlug')?.toString()?.trim()
  const { mesa, error } = await resolverMesa(slug)
  if (error || !mesa) return { error }

  const payload = await getPayloadClient()
  const sesion = await sesionAbiertaDeMesa(payload, mesa.id)

  if (!sesion || !sesion.anfitrionCedula) return { error: NO_COINCIDE }

  if (!coincideCedula(sesion, formData.get('cedula')?.toString())) {
    return { error: NO_COINCIDE }
  }

  await escribirMesa(sesion, 'invitado')
  refrescar(slug!)

  return { ok: true, anfitrionNombre: sesion.anfitrionNombre ?? undefined }
}

/** Reclama una mesa que abrió el mesero desde el POS. */
export async function reclamarSesionMesa(
  _prev: EstadoPuerta,
  formData: FormData,
): Promise<EstadoPuerta> {
  const slug = formData.get('mesaSlug')?.toString()?.trim()
  const { mesa, error } = await resolverMesa(slug)
  if (error || !mesa) return { error }

  const payload = await getPayloadClient()
  const sesion = await sesionAbiertaDeMesa(payload, mesa.id)
  if (!sesion) return { error: 'Esta mesa ya se cerró. Vuelve a escanear el código QR.' }

  const resultado = await reclamarSesion(payload, sesion as SesionMesa, {
    nombre: formData.get('nombre')?.toString() ?? '',
    cedula: formData.get('cedula')?.toString() ?? '',
  })

  if (resultado.error || !resultado.sesion) return { error: resultado.error }

  await escribirMesa(resultado.sesion, 'anfitrion')
  refrescar(slug!)

  return { ok: true, anfitrionNombre: resultado.sesion.anfitrionNombre ?? undefined }
}
