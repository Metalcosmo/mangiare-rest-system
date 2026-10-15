'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import QRCode from 'qrcode'

import type { EstadoAccion } from '@/actions/crud'
import { usuarioActual } from '@/lib/auth'
import { getPayloadClient } from '@/lib/payload'

/** Estados posibles de una mesa en el salón. */
export type EstadoMesa = 'libre' | 'ocupada' | 'reservada' | 'limpieza' | 'fuera_servicio'

const ESTADOS_MESA: EstadoMesa[] = [
  'libre',
  'ocupada',
  'reservada',
  'limpieza',
  'fuera_servicio',
]

const ETIQUETA_MESA: Record<EstadoMesa, string> = {
  libre: 'Libre',
  ocupada: 'Ocupada',
  reservada: 'Reservada',
  limpieza: 'Por limpiar',
  fuera_servicio: 'Fuera de servicio',
}

/** Resultado de generar el código QR de una mesa. */
export type ResultadoQr = {
  nombre?: string
  slug?: string
  url?: string
  dataUrl?: string
  error?: string
}

type MesaQr = {
  id: string | number
  nombre?: string | null
  slug?: string | null
}

/** Convierte un texto libre en un identificador apto para una URL. */
const slugificar = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/**
 * Identificador público de la mesa.
 *
 * Se usa el campo `slug`; si la colección no lo tiene configurado todavía se
 * deriva del nombre para que el código QR siga siendo utilizable.
 */
const slugDeMesa = (mesa: MesaQr): string => {
  const propio = typeof mesa.slug === 'string' ? mesa.slug.trim() : ''
  return propio || slugificar(mesa.nombre ?? '')
}

/** Origen público del sitio a partir de las cabeceras de la petición. */
async function origenPublico(): Promise<string | null> {
  const cabeceras = await headers()
  const host = cabeceras.get('host')
  if (!host) return null
  const proto = cabeceras.get('x-forwarded-proto') ?? 'http'
  return `${proto}://${host}`
}

/** Construye la imagen del QR de una mesa junto con su URL pública. */
async function construirQr(mesa: MesaQr): Promise<ResultadoQr> {
  const slug = slugDeMesa(mesa)
  if (!slug) {
    return { error: 'La mesa no tiene nombre ni slug para generar su código QR.' }
  }

  const origen = await origenPublico()
  if (!origen) return { error: 'No pudimos determinar la dirección del sitio.' }

  const url = `${origen}/mesa/${slug}`

  try {
    const dataUrl = await QRCode.toDataURL(url, { width: 512, margin: 2 })
    return { nombre: mesa.nombre ?? slug, slug, url, dataUrl }
  } catch {
    return { error: 'No pudimos generar la imagen del código QR.' }
  }
}

/** Cambia el estado de una mesa desde el mapa del salón. */
export async function cambiarEstadoMesa(
  mesaId: string | number,
  estado: EstadoMesa,
): Promise<EstadoAccion> {
  if (!ESTADOS_MESA.includes(estado)) {
    return { error: 'Estado de mesa no válido.' }
  }

  const usuario = await usuarioActual()
  if (!usuario) return { error: 'Tu sesión expiró. Vuelve a entrar.' }

  const payload = await getPayloadClient()

  try {
    await payload.update({
      collection: 'mesas',
      id: mesaId,
      data: { estado } as never,
      overrideAccess: false,
      user: usuario as never,
    })
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : 'No pudimos cambiar el estado de la mesa.'
    return { error: mensaje }
  }

  revalidatePath('/panel/salon')
  return { ok: true, mensaje: `Mesa marcada como ${ETIQUETA_MESA[estado].toLowerCase()}.` }
}

/** Genera el código QR de una sola mesa (se invoca al abrir el diálogo). */
export async function generarQrMesa(mesaId: string | number): Promise<ResultadoQr> {
  const usuario = await usuarioActual()
  if (!usuario) return { error: 'Tu sesión expiró. Vuelve a entrar.' }

  const payload = await getPayloadClient()

  let mesa: MesaQr | null = null
  try {
    mesa = (await payload.findByID({
      collection: 'mesas',
      id: mesaId,
      depth: 0,
      overrideAccess: false,
      user: usuario as never,
    })) as MesaQr | null
  } catch {
    return { error: 'No encontramos la mesa indicada.' }
  }

  if (!mesa) return { error: 'No encontramos la mesa indicada.' }

  return construirQr(mesa)
}

/** Genera los códigos QR de todas las mesas activas (hoja imprimible). */
export async function generarQrMesas(): Promise<{ qrs: ResultadoQr[]; error?: string }> {
  const usuario = await usuarioActual()
  if (!usuario) return { qrs: [], error: 'Tu sesión expiró. Vuelve a entrar.' }

  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'mesas',
    depth: 0,
    limit: 300,
    pagination: false,
    sort: 'nombre',
    overrideAccess: false,
    user: usuario as never,
  })

  const activas = (docs as unknown as Array<MesaQr & { activa?: boolean | null }>).filter(
    (mesa) => mesa.activa !== false,
  )

  const qrs: ResultadoQr[] = []
  for (const mesa of activas) {
    const qr = await construirQr(mesa)
    if (!qr.error) qrs.push(qr)
  }

  return { qrs }
}
