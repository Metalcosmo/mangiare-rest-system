import type { Payload } from 'payload'

import { validarVariaciones } from './carta'
import { idNumero } from './ids'
import type { SesionMesa } from './mesa-sesion'
import { firmaDeItem, MAX_LINEAS, MAX_POR_LINEA, type ItemEntrada } from './pedidos'

/**
 * El pedido compartido de una mesa.
 *
 * Mientras nadie lo manda al mesero, el pedido vive en `estado: 'borrador'`:
 * el anfitrión y los invitados agregan, quitan y cambian cantidades sobre el
 * mismo registro del servidor, así que todos los teléfonos ven lo mismo. Sólo
 * el anfitrión puede enviarlo (ver `src/actions/borrador.ts`).
 *
 * Se guarda como un `pedido` normal para reutilizar el precios del catálogo y
 * los totales del hook `prepararPedido`; enviarlo es un cambio de estado, no una
 * copia de datos.
 */

export type ItemBorrador = {
  id?: string | number
  producto?: unknown
  cantidad?: number | null
  nombre?: string | null
  precioUnitario?: number | null
  estacion?: string | null
  modificadores?: Array<{ nombre?: string | null; precioExtra?: number | null }> | null
  notas?: string | null
  estadoItem?: string | null
  subtotal?: number | null
}

export type Borrador = {
  id: string | number
  estado?: string | null
  folio?: string | null
  ronda?: number | null
  sesion?: unknown
  mesa?: unknown
  clienteNombre?: string | null
  comensales?: number | null
  items?: ItemBorrador[] | null
}

/** El borrador vigente de la sesión, si hay uno. */
export async function borradorDeSesion(
  payload: Payload,
  sesionId: string | number,
): Promise<Borrador | null> {
  const { docs } = await payload.find({
    collection: 'pedidos',
    where: {
      sesion: { equals: idNumero(sesionId) },
      estado: { equals: 'borrador' },
    },
    sort: 'id',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  return (docs[0] as unknown as Borrador) ?? null
}

/**
 * Agrega una línea al pedido de la mesa. El borrador se crea recién cuando
 * alguien agrega el primer platillo: un pedido sin líneas no es válido.
 */
export async function agregarLinea(
  payload: Payload,
  entrada: { sesion: SesionMesa; item: ItemEntrada },
): Promise<{ borrador?: Borrador; error?: string }> {
  const { sesion, item } = entrada

  const producto = await productoDisponible(payload, item.producto)
  if (!producto) {
    return { error: 'Ese platillo ya no está disponible.' }
  }

  const variaciones = validarVariaciones([item], [producto])
  if (variaciones) return { error: variaciones }

  const actual = await borradorDeSesion(payload, sesion.id)

  if (!actual) {
    const borrador = (await payload.create({
      collection: 'pedidos',
      overrideAccess: true,
      data: {
        canal: 'mesa',
        estado: 'borrador',
        mesa: idNumero(sesion.mesa),
        sesion: idNumero(sesion.id),
        clienteNombre: sesion.anfitrionNombre ?? null,
        items: [item],
      } as never,
    })) as unknown as Borrador

    return { borrador }
  }

  const items = [...(actual.items ?? [])]
  const existente = items.findIndex((linea) => firmaDeItem(linea) === firmaDeItem(item))

  if (existente >= 0 && !item.notas) {
    const cantidad = (items[existente].cantidad ?? 0) + item.cantidad
    items[existente] = {
      ...items[existente],
      cantidad: Math.min(cantidad, MAX_POR_LINEA),
    }
  } else {
    if (items.length + 1 > MAX_LINEAS) {
      return { error: `El pedido no puede tener más de ${MAX_LINEAS} líneas.` }
    }
    items.push(item)
  }

  return { borrador: await reemplazarItems(payload, actual.id, items) }
}

/** Suma o resta unidades de una línea (delta). Si llega a cero, se quita. */
export async function cambiarCantidad(
  payload: Payload,
  entrada: { borradorId: string | number; indice: number; delta: number },
): Promise<{ borrador?: Borrador; error?: string }> {
  const actual = await porId(payload, entrada.borradorId)
  if (!actual) return { error: 'No encontramos el pedido de la mesa.' }

  const items = [...(actual.items ?? [])]
  const linea = items[entrada.indice]
  if (!linea) return { error: 'No encontramos ese platillo.' }

  const cantidad = (linea.cantidad ?? 1) + entrada.delta
  if (cantidad <= 0) return quitarLinea(payload, entrada.borradorId, entrada.indice)
  if (cantidad > MAX_POR_LINEA) {
    return { error: `No puedes pedir más de ${MAX_POR_LINEA} de un mismo platillo.` }
  }

  items[entrada.indice] = { ...linea, cantidad }
  return { borrador: await reemplazarItems(payload, actual.id, items) }
}

/** Quita una línea. Si era la última, el borrador se borra entero. */
export async function quitarLinea(
  payload: Payload,
  borradorId: string | number,
  indice: number,
): Promise<{ borrador?: Borrador; error?: string }> {
  const actual = await porId(payload, borradorId)
  if (!actual) return { error: 'No encontramos el pedido de la mesa.' }

  const items = (actual.items ?? []).filter((_, posicion) => posicion !== indice)
  if (items.length === 0) {
    await payload.delete({
      collection: 'pedidos',
      id: idNumero(borradorId),
      overrideAccess: true,
    })
    return {}
  }

  return { borrador: await reemplazarItems(payload, actual.id, items) }
}

/** Manda el pedido al mesero: deja de ser borrador y pasa a la cola de revisión. */
export async function enviarBorrador(
  payload: Payload,
  entrada: { borrador: Borrador; sesionId: string | number; requiereAprobacion: boolean },
): Promise<{ borrador?: Borrador; error?: string }> {
  const { borrador, sesionId, requiereAprobacion } = entrada

  if ((borrador.items ?? []).length === 0) {
    return { error: 'El pedido está vacío. Agrega al menos un platillo.' }
  }

  // La ronda sale del total de pedidos de la sesión, incluido este borrador.
  const { totalDocs } = await payload.count({
    collection: 'pedidos',
    where: { sesion: { equals: idNumero(sesionId) } },
    overrideAccess: true,
  })

  const actualizado = (await payload.update({
    collection: 'pedidos',
    id: idNumero(borrador.id),
    overrideAccess: true,
    data: {
      estado: requiereAprobacion ? 'por_confirmar' : 'nuevo',
      ronda: totalDocs,
      horaEnvioCocina: requiereAprobacion ? null : new Date().toISOString(),
    } as never,
  })) as unknown as Borrador

  return { borrador: actualizado }
}

/**
 * Descarta los borradores de una sesión.
 *
 * Un borrador sólo lo puede mandar el anfitrión con su cookie; cuando la sesión
 * se cierra, ese borrador queda inalcanzable. Si no se borrara, seguiría
 * contando como «sin enviar» sobre la mesa y bloquearía el cobro.
 */
export async function descartarBorradoresDeSesion(
  payload: Payload,
  sesionId: string | number,
): Promise<void> {
  const { docs } = await payload.find({
    collection: 'pedidos',
    where: { sesion: { equals: idNumero(sesionId) }, estado: { equals: 'borrador' } },
    depth: 0,
    limit: 50,
    pagination: false,
    overrideAccess: true,
  })

  for (const pedido of docs) {
    await payload.delete({
      collection: 'pedidos',
      id: idNumero(pedido.id),
      overrideAccess: true,
    })
  }
}

/** El personal descarta lo que la mesa dejó sin enviar. */
export async function descartarBorrador(
  payload: Payload,
  borradorId: string | number,
): Promise<{ error?: string }> {
  const actual = await porId(payload, borradorId)
  if (!actual) return { error: 'No encontramos el pedido de la mesa.' }

  await payload.delete({
    collection: 'pedidos',
    id: idNumero(borradorId),
    overrideAccess: true,
  })

  return {}
}

/** Trae un borrador por id, verificando que siga siéndolo. */
export async function porId(
  payload: Payload,
  borradorId: string | number,
): Promise<Borrador | null> {
  try {
    const doc = (await payload.findByID({
      collection: 'pedidos',
      id: idNumero(borradorId),
      depth: 0,
      overrideAccess: true,
    })) as unknown as Borrador

    return doc?.estado === 'borrador' ? doc : null
  } catch {
    return null
  }
}

async function reemplazarItems(
  payload: Payload,
  borradorId: string | number,
  items: ItemBorrador[],
): Promise<Borrador> {
  return (await payload.update({
    collection: 'pedidos',
    id: idNumero(borradorId),
    overrideAccess: true,
    data: { items } as never,
  })) as unknown as Borrador
}

/** Producto disponible, con sus grupos de opciones para validar variaciones. */
async function productoDisponible(payload: Payload, productoId: string | number) {
  const { docs } = await payload.find({
    collection: 'productos',
    where: { id: { equals: idNumero(productoId) }, disponible: { equals: true } },
    depth: 1,
    limit: 1,
    overrideAccess: true,
  })

  return docs[0] ?? null
}
