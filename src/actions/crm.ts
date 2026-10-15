'use server'

import { revalidatePath } from 'next/cache'

import { usuarioActual } from '@/lib/auth'
import { getPayloadClient } from '@/lib/payload'

/** Resultado uniforme de las acciones del CRM. */
export type ResultadoCrm = {
  ok?: boolean
  error?: string
  mensaje?: string
}

/** Cliente resumido que devuelven los segmentos. */
export type ClienteSegmento = {
  id: string
  nombre: string
  telefono?: string | null
  email?: string | null
}

/** Segmento calculado de la cartera de clientes. */
export type Segmento = {
  clave: string
  titulo: string
  descripcion: string
  total: number
  clientes: ClienteSegmento[]
}

const RUTA_CLIENTES = '/panel/clientes'

/** Sello de fecha y hora en es-MX para dejar constancia en las notas. */
const selloDeTiempo = (): string =>
  new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())

/** Agrega una línea fechada al final de las notas del cliente. */
const agregarNota = (notas: string | null | undefined, texto: string): string =>
  [notas?.trim(), `[${selloDeTiempo()}] ${texto}`].filter(Boolean).join('\n')

/** Revalida la lista y la ficha del cliente afectado. */
const revalidarCliente = (clienteId: string) => {
  revalidatePath(RUTA_CLIENTES)
  revalidatePath(`${RUTA_CLIENTES}/${clienteId}`)
}

/**
 * Canjea una recompensa del catálogo: valida puntos suficientes, los descuenta
 * y deja la constancia en las notas del cliente.
 */
export async function canjearRecompensa(
  clienteId: string,
  recompensaId: string,
): Promise<ResultadoCrm> {
  const usuario = await usuarioActual()
  if (!usuario) return { error: 'Tu sesión expiró. Vuelve a entrar.' }

  const payload = await getPayloadClient()

  try {
    const cliente = await payload.findByID({
      collection: 'clientes',
      id: clienteId,
      depth: 0,
      overrideAccess: false,
      user: usuario as never,
    })

    const recompensa = await payload.findByID({
      collection: 'recompensas',
      id: recompensaId,
      depth: 0,
      overrideAccess: false,
      user: usuario as never,
    })

    if (!recompensa.activa) {
      return { error: 'Esa recompensa ya no está activa.' }
    }

    const disponibles = Number(cliente.puntos ?? 0)
    const costo = Number(recompensa.costoPuntos ?? 0)

    if (costo <= 0) return { error: 'La recompensa no tiene un costo de puntos válido.' }
    if (disponibles < costo) {
      return {
        error: `Puntos insuficientes: tiene ${disponibles} y la recompensa cuesta ${costo}.`,
      }
    }

    await payload.update({
      collection: 'clientes',
      id: clienteId,
      data: {
        puntos: disponibles - costo,
        notas: agregarNota(cliente.notas, `Canje de recompensa: ${recompensa.nombre} (-${costo} puntos).`),
      } as never,
      overrideAccess: false,
      user: usuario as never,
    })

    revalidarCliente(clienteId)

    return { ok: true, mensaje: `Se canjeó "${recompensa.nombre}" por ${costo} puntos.` }
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'No pudimos registrar el canje.'
    return { error: mensaje }
  }
}

/**
 * Ajusta manualmente los puntos del cliente (positivo o negativo) y deja el
 * motivo registrado en sus notas.
 */
export async function ajustarPuntos(
  clienteId: string,
  delta: number,
  motivo: string,
): Promise<ResultadoCrm> {
  const usuario = await usuarioActual()
  if (!usuario) return { error: 'Tu sesión expiró. Vuelve a entrar.' }

  const ajuste = Math.round(Number(delta))
  if (!Number.isFinite(ajuste) || ajuste === 0) {
    return { error: 'Indica una cantidad de puntos distinta de cero.' }
  }

  const razon = motivo.trim()
  if (!razon) return { error: 'Escribe el motivo del ajuste.' }

  const payload = await getPayloadClient()

  try {
    const cliente = await payload.findByID({
      collection: 'clientes',
      id: clienteId,
      depth: 0,
      overrideAccess: false,
      user: usuario as never,
    })

    const disponibles = Number(cliente.puntos ?? 0)
    const resultado = disponibles + ajuste

    if (resultado < 0) {
      return {
        error: `El cliente sólo tiene ${disponibles} puntos; no puede quedar en negativo.`,
      }
    }

    const signo = ajuste > 0 ? '+' : ''

    await payload.update({
      collection: 'clientes',
      id: clienteId,
      data: {
        puntos: resultado,
        notas: agregarNota(cliente.notas, `Ajuste de puntos: ${signo}${ajuste} (${razon}).`),
      } as never,
      overrideAccess: false,
      user: usuario as never,
    })

    revalidarCliente(clienteId)

    return {
      ok: true,
      mensaje: `Puntos actualizados: ${signo}${ajuste}. Saldo actual: ${resultado}.`,
    }
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'No pudimos ajustar los puntos.'
    return { error: mensaje }
  }
}

/**
 * Calcula los segmentos de fidelización a partir de la cartera completa de
 * clientes. Se resuelve en memoria porque el volumen de un restaurante es bajo.
 */
export async function resumenSegmentos(): Promise<Segmento[]> {
  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'clientes',
    depth: 0,
    limit: 1000,
    pagination: false,
    sort: 'nombre',
    overrideAccess: true,
  })

  const ahora = new Date()
  const limiteInactivo = new Date(ahora.getTime() - 60 * 24 * 60 * 60 * 1000)
  const mesActual = ahora.getUTCMonth()

  const resumir = (doc: (typeof docs)[number]): ClienteSegmento => ({
    id: String(doc.id),
    nombre: doc.nombre ?? 'Sin nombre',
    telefono: doc.telefono ?? null,
    email: doc.email ?? null,
  })

  const etiquetasDe = (doc: (typeof docs)[number]): string[] =>
    Array.isArray(doc.etiquetas) ? doc.etiquetas : []

  const cumpleEnMes = (doc: (typeof docs)[number]): boolean => {
    if (!doc.fechaNacimiento) return false
    const nacimiento = new Date(doc.fechaNacimiento)
    if (Number.isNaN(nacimiento.getTime())) return false
    return nacimiento.getUTCMonth() === mesActual
  }

  const inactivo = (doc: (typeof docs)[number]): boolean => {
    if (!doc.ultimaVisita) return false
    const ultima = new Date(doc.ultimaVisita)
    if (Number.isNaN(ultima.getTime())) return false
    return ultima.getTime() < limiteInactivo.getTime()
  }

  const definiciones: Array<{
    clave: string
    titulo: string
    descripcion: string
    filtro: (doc: (typeof docs)[number]) => boolean
  }> = [
    {
      clave: 'vip',
      titulo: 'VIP',
      descripcion: 'Clientes marcados como VIP por su valor o preferencia.',
      filtro: (doc) => etiquetasDe(doc).includes('vip'),
    },
    {
      clave: 'frecuente',
      titulo: 'Frecuentes',
      descripcion: 'Clientes marcados como frecuentes: vuelven con regularidad.',
      filtro: (doc) => etiquetasDe(doc).includes('frecuente'),
    },
    {
      clave: 'nuevo',
      titulo: 'Nuevos',
      descripcion: 'Con una visita o menos: aún no consolidan el hábito.',
      filtro: (doc) => Number(doc.visitas ?? 0) <= 1,
    },
    {
      clave: 'inactivo',
      titulo: 'Inactivos (+60 días)',
      descripcion: 'Sin visitar el restaurante en los últimos 60 días.',
      filtro: inactivo,
    },
    {
      clave: 'cumpleanos',
      titulo: 'Cumpleaños del mes',
      descripcion: 'Cumplen años en el mes en curso: buen momento para consentir.',
      filtro: cumpleEnMes,
    },
  ]

  return definiciones.map(({ clave, titulo, descripcion, filtro }) => {
    const clientes = docs.filter(filtro).map(resumir)
    return { clave, titulo, descripcion, total: clientes.length, clientes }
  })
}
