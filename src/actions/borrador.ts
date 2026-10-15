'use server'

import { revalidatePath } from 'next/cache'
import type { Where } from 'payload'

import { cerrarSesionSiCorresponde } from '@/hooks/pedidos'
import { usuarioActual } from '@/lib/auth'
import { idNumero } from '@/lib/ids'
import { sesionAbiertaDeMesa } from '@/lib/mesa-sesion'
import {
  agregarLinea,
  borradorDeSesion,
  cambiarCantidad,
  descartarBorrador,
  enviarBorrador,
  quitarLinea,
  type Borrador,
} from '@/lib/borrador'
import { leerMesa } from '@/lib/mesa-cookie'
import type { RolMesa, SesionMesa } from '@/lib/mesa-sesion'
import { getPayloadClient, obtenerAjustes } from '@/lib/payload'
import { parsearItem } from '@/lib/pedidos'

/**
 * El pedido compartido de la mesa, armado antes de mandarlo al mesero.
 *
 * Cualquiera que haya entrado a la mesa (anfitrión o invitado) puede agregar,
 * quitar y cambiar cantidades. **Sólo el anfitrión puede enviarlo**: la regla se
 * vuelve a comprobar aquí, nunca se confía en que la interfaz oculte el botón.
 */

export type ResultadoPedido = {
  ok?: boolean
  error?: string
  mensaje?: string
  aviso?: string
}

type Contexto = {
  mesa?: { id: string | number; slug?: string | null }
  sesion?: SesionMesa
  rol?: RolMesa
  error?: string
}

const SIN_SESION = 'La cuenta de esta mesa ya se cerró. Vuelve a escanear el código QR.'

async function contexto(mesaSlug: string): Promise<Contexto> {
  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'mesas',
    where: { slug: { equals: mesaSlug }, activa: { equals: true } } as Where,
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })

  const mesa = docs[0] as unknown as { id: string | number; slug?: string | null } | undefined
  if (!mesa) return { error: SIN_SESION }

  const leida = await leerMesa(mesa.id)
  if (!leida) return { error: SIN_SESION }

  return { mesa, sesion: leida.sesion, rol: leida.rol }
}

function refrescarTodo(mesaSlug: string): void {
  revalidatePath(`/mesa/${mesaSlug}`)
  revalidatePath('/panel/mesero')
  revalidatePath('/panel/salon')
  revalidatePath('/panel/pos')
  revalidatePath('/panel/pedidos')
  revalidatePath('/panel/kds')
}

/** Agrega un platillo al pedido de la mesa. */
export async function agregarAlPedido(
  mesaSlug: string,
  entrada: {
    producto: string | number
    cantidad: number
    modificadores?: Array<{ nombre: string; precioExtra: number }>
    notas?: string
  },
): Promise<ResultadoPedido> {
  const { mesa, sesion, error } = await contexto(mesaSlug)
  if (error || !mesa || !sesion) return { error }

  const { item, error: lineaError } = parsearItem({
    producto: entrada.producto,
    cantidad: entrada.cantidad,
    modificadores: entrada.modificadores,
    notas: entrada.notas,
  })
  if (lineaError || !item) return { error: lineaError }

  const payload = await getPayloadClient()
  const resultado = await agregarLinea(payload, { sesion, item })
  if (resultado.error) return { error: resultado.error }

  refrescarTodo(mesaSlug)
  return { ok: true }
}

/** Suma o resta unidades de una línea del pedido de la mesa. */
export async function cambiarCantidadDelPedido(
  mesaSlug: string,
  indice: number,
  delta: number,
): Promise<ResultadoPedido> {
  const { mesa, sesion, error } = await contexto(mesaSlug)
  if (error || !mesa || !sesion) return { error }

  const payload = await getPayloadClient()
  const borrador = await borradorDeSesion(payload, sesion.id)
  if (!borrador) return { error: 'El pedido de la mesa ya no existe.' }

  const resultado = await cambiarCantidad(payload, {
    borradorId: borrador.id,
    indice,
    delta,
  })
  if (resultado.error) return { error: resultado.error }

  refrescarTodo(mesaSlug)
  return { ok: true }
}

/** Quita una línea del pedido de la mesa. */
export async function quitarDelPedido(
  mesaSlug: string,
  indice: number,
): Promise<ResultadoPedido> {
  const { mesa, sesion, error } = await contexto(mesaSlug)
  if (error || !mesa || !sesion) return { error }

  const payload = await getPayloadClient()
  const borrador = await borradorDeSesion(payload, sesion.id)
  if (!borrador) return { error: 'El pedido de la mesa ya no existe.' }

  const resultado = await quitarLinea(payload, borrador.id, indice)
  if (resultado.error) return { error: resultado.error }

  refrescarTodo(mesaSlug)
  return { ok: true }
}

/** Manda el pedido al mesero. Sólo el anfitrión. */
export async function enviarPedidoDeMesa(
  mesaSlug: string,
  opciones: { telefono?: string; propina?: number } = {},
): Promise<ResultadoPedido> {
  const { mesa, sesion, rol, error } = await contexto(mesaSlug)
  if (error || !mesa || !sesion) return { error }

  if (rol !== 'anfitrion') {
    return { error: 'Sólo quien abrió la mesa puede enviar el pedido al mesero.' }
  }

  const payload = await getPayloadClient()
  const borrador = await borradorDeSesion(payload, sesion.id)
  if (!borrador) return { error: 'Todavía no han agregado ningún platillo.' }

  const telefono = opciones.telefono?.trim().slice(0, 40) || null
  const propina = Math.max(0, Number(opciones.propina) || 0)

  // El teléfono y la propina son decisiones de quien manda el pedido.
  await payload.update({
    collection: 'pedidos',
    id: idNumero(borrador.id),
    overrideAccess: true,
    data: { clienteTelefono: telefono, propina } as never,
  })

  const ajustes = await obtenerAjustes()
  const requiereAprobacion = ajustes.requiereAprobacionMesa !== false

  const resultado = await enviarBorrador(payload, {
    borrador: borrador as Borrador,
    sesionId: sesion.id,
    requiereAprobacion,
  })
  if (resultado.error) return { error: resultado.error }

  if (telefono) {
    await vincularCliente(
      payload,
      idNumero(resultado.borrador?.id ?? borrador.id),
      telefono,
      sesion.anfitrionNombre ?? null,
    )
  }

  refrescarTodo(mesaSlug)

  return {
    ok: true,
    mensaje: requiereAprobacion
      ? 'Pedido enviado. Un mesero lo confirmará en un momento.'
      : 'Pedido enviado a cocina.',
  }
}

/**
 * Guarda el teléfono en el CRM y lo enlaza al pedido.
 * Se hace al enviar, no al crear el borrador: un borrador todavía no es venta.
 */
async function vincularCliente(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  pedidoId: number,
  telefono: string,
  nombre: string | null,
): Promise<void> {
  const { docs } = await payload.find({
    collection: 'clientes',
    where: { telefono: { equals: telefono } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  let clienteId = docs[0]?.id

  if (!clienteId) {
    const nuevo = await payload.create({
      collection: 'clientes',
      overrideAccess: true,
      data: {
        nombre: nombre || `Cliente ${telefono}`,
        telefono,
        aceptaMarketing: false,
        etiquetas: ['nuevo'],
        notas: 'Alta automática desde la carta de la mesa.',
      },
    })
    clienteId = nuevo.id
  }

  await payload.update({
    collection: 'pedidos',
    id: pedidoId,
    data: { cliente: idNumero(clienteId) } as never,
    overrideAccess: true,
  })
}

/** El personal descarta lo que la mesa dejó sin enviar. */
export async function descartarPedidoEnBorrador(mesaSlug: string): Promise<ResultadoPedido> {
  const usuario = await usuarioActual()
  if (!usuario) return { error: 'Tu sesión expiró.' }
  if (!['admin', 'gerente', 'cajero', 'mesero'].includes(usuario.rol ?? '')) {
    return { error: 'Tu rol no puede descartar pedidos.' }
  }

  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'mesas',
    where: { slug: { equals: mesaSlug }, activa: { equals: true } } as Where,
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })

  const mesa = docs[0] as unknown as { id: string | number } | undefined
  if (!mesa) return { error: 'No encontramos esa mesa.' }

  // El personal no lleva la cookie de la mesa: la sesión se busca por la mesa.
  const sesion = await sesionAbiertaDeMesa(payload, mesa.id)
  if (!sesion) return { error: 'Esa mesa no tiene una cuenta abierta.' }

  const borrador = await borradorDeSesion(payload, sesion.id)
  if (!borrador) return { error: 'La mesa no tiene platillos sin enviar.' }

  const resultado = await descartarBorrador(payload, borrador.id)
  if (resultado.error) return { error: resultado.error }

  // Descartar es un DELETE: nadie más va a revisar si la sesión quedó vacía.
  await cerrarSesionSiCorresponde(payload, Number(sesion.id))

  refrescarTodo(mesaSlug)
  return { ok: true, mensaje: 'Se descartó lo que la mesa tenía sin enviar.' }
}
