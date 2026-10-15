'use server'

import { revalidatePath } from 'next/cache'
import type { Where } from 'payload'

import { usuarioActual } from '@/lib/auth'
import { SEGMENTOS_AUDIENCIA, type SegmentoAudiencia } from '@/lib/marketing'
import { getPayloadClient } from '@/lib/payload'

export type EjemploAudiencia = { nombre: string; telefono: string }

export type AudienciaEstimada = {
  total: number
  ejemplos: EjemploAudiencia[]
}

export type ResultadoAudiencia = AudienciaEstimada & { ok?: boolean; error?: string }

export type EstadoAccionMarketing = {
  ok?: boolean
  error?: string
  mensaje?: string
}

const esSegmento = (valor: string): valor is SegmentoAudiencia =>
  (SEGMENTOS_AUDIENCIA as readonly string[]).includes(valor)

/** Rango [inicio, fin) del mes en curso, en la zona horaria del servidor. */
function rangoMesActual(): { inicio: Date; fin: Date } {
  const ahora = new Date()
  const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0, 0)
  const fin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1, 0, 0, 0, 0)
  return { inicio, fin }
}

/** Traduce el segmento de una campaña a un filtro de Payload sobre `clientes`. */
function filtroDeSegmento(segmento: SegmentoAudiencia): Where {
  switch (segmento) {
    case 'vip':
      return { etiquetas: { in: ['vip'] } }
    case 'frecuente':
      return { etiquetas: { in: ['frecuente'] } }
    case 'inactivo': {
      const hace60Dias = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      return { ultimaVisita: { less_than: hace60Dias.toISOString() } }
    }
    case 'cumpleanos': {
      const { inicio, fin } = rangoMesActual()
      return {
        and: [
          { fechaNacimiento: { greater_than_equal: inicio.toISOString() } },
          { fechaNacimiento: { less_than: fin.toISOString() } },
        ],
      }
    }
    case 'nuevo':
      return { visitas: { less_than_equal: 1 } }
    case 'todos':
    default:
      return {}
  }
}

/**
 * Cuenta cuántos clientes caen en un segmento y devuelve una muestra.
 * Es un cálculo de sistema: se ejecuta con acceso elevado.
 */
export async function estimarAudiencia(segmento: string): Promise<ResultadoAudiencia> {
  if (!esSegmento(segmento)) {
    return { total: 0, ejemplos: [], error: 'Segmento no reconocido.' }
  }

  const usuario = await usuarioActual()
  if (!usuario) return { total: 0, ejemplos: [], error: 'Tu sesión expiró. Vuelve a entrar.' }

  const payload = await getPayloadClient()

  try {
    const resultado = await payload.find({
      collection: 'clientes',
      depth: 0,
      limit: 6,
      sort: '-totalGastado',
      where: filtroDeSegmento(segmento),
      overrideAccess: true,
    })

    return {
      ok: true,
      total: resultado.totalDocs,
      ejemplos: (resultado.docs as unknown as Array<Record<string, unknown>>).map((cliente) => ({
        nombre: String(cliente.nombre ?? 'Cliente'),
        telefono: String(cliente.telefono ?? 'Sin teléfono'),
      })),
    }
  } catch {
    return { total: 0, ejemplos: [], error: 'No pudimos calcular la audiencia.' }
  }
}

/** Tamaño del segmento de una campaña (usado al registrar un envío). */
async function totalDeSegmento(segmento: SegmentoAudiencia): Promise<number> {
  const payload = await getPayloadClient()
  const resultado = await payload.count({
    collection: 'clientes',
    where: filtroDeSegmento(segmento),
    overrideAccess: true,
  })
  return resultado.totalDocs
}

/**
 * Registra una campaña como enviada: estado `enviada`, `enviados` con el tamaño
 * del segmento y `programadaPara` con la fecha y hora actuales.
 *
 * Nota: no hay integración real de correo/SMS; esto deja constancia del envío.
 */
export async function marcarCampanaEnviada(
  id: string | number,
): Promise<EstadoAccionMarketing> {
  const usuario = await usuarioActual()
  if (!usuario) return { error: 'Tu sesión expiró. Vuelve a entrar.' }

  const payload = await getPayloadClient()

  let segmento: SegmentoAudiencia
  try {
    const campana = await payload.findByID({
      collection: 'campanas',
      id,
      depth: 0,
      overrideAccess: true,
    })
    segmento = campana?.segmento as SegmentoAudiencia
  } catch {
    return { error: 'No encontramos la campaña.' }
  }

  const total =
    segmento && esSegmento(segmento) ? await totalDeSegmento(segmento) : 0

  try {
    await payload.update({
      collection: 'campanas',
      id,
      data: {
        estado: 'enviada',
        enviados: total,
        programadaPara: new Date().toISOString(),
      },
      overrideAccess: false,
      user: usuario as never,
    })
  } catch {
    return { error: 'No pudimos registrar el envío de la campaña.' }
  }

  revalidatePath('/panel/marketing')
  return { ok: true, mensaje: `Campaña registrada como enviada a ${total} clientes.` }
}
