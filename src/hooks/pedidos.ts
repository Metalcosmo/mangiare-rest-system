import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  Payload,
  PayloadRequest,
} from 'payload'

import { descartarBorradoresDeSesion } from '../lib/borrador'
import { costoDePedido, moverInventarioDePedido, redondear } from '../lib/inventario'
import { claveDe, idCrudo, idNumero } from '../lib/ids'
import { resolverModificadores } from '../lib/carta'
import {
  ESTADOS_ACTIVOS,
  ESTADOS_QUE_MANTIENEN_LA_MESA,
  calcularTotales,
  consumeInventario,
  folioSiguiente,
  prefijoDeFolio,
  type Canal,
} from '../lib/pedidos'

type ItemEntrada = {
  producto?: unknown
  cantidad?: number | null
  nombre?: string | null
  precioUnitario?: number | null
  estacion?: string | null
  modificadores?: Array<{ nombre?: string | null; precioExtra?: number | null }> | null
  estadoItem?: string | null
  subtotal?: number | null
}

type PedidoData = {
  folio?: string | null
  canal?: Canal | null
  estado?: string | null
  items?: ItemEntrada[] | null
  descuento?: number | null
  propina?: number | null
  impuesto?: number | null
  subtotal?: number | null
  total?: number | null
  costoEstimado?: number | null
  mesa?: unknown
  sesion?: unknown
  cliente?: unknown
  clienteTelefono?: string | null
  clienteNombre?: string | null
}

type ProductoInfo = {
  id: string | number
  nombre?: string
  precio?: number
  precioPromocional?: number
  estacion?: string
  gruposModificadores?: unknown
}

const ESTADOS_EN_MESA: string[] = [...ESTADOS_ACTIVOS]

/** Completa nombre, precio y estación desde el catálogo (fuente de verdad). */
async function completarItems(
  payload: Payload,
  items: ItemEntrada[],
  req?: Partial<PayloadRequest>,
): Promise<void> {
  const ids = [
    ...new Set(
      items
        .map((item) => idCrudo(item.producto))
        .filter((id): id is string | number => id !== undefined),
    ),
  ]
  if (ids.length === 0) return

  const { docs } = await payload.find({
    collection: 'productos',
    where: { id: { in: ids } },
    // Profundidad 1: hace falta el catálogo de opciones para repreciar los extras.
    depth: 1,
    limit: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })

  const porId = new Map(
    (docs as unknown as ProductoInfo[]).map((producto) => [String(producto.id), producto]),
  )

  for (const item of items) {
    const producto = porId.get(claveDe(item.producto))
    if (!producto) continue
    item.nombre = producto.nombre
    item.precioUnitario = producto.precioPromocional ?? producto.precio ?? 0
    item.estacion = producto.estacion ?? 'cocina'
    // El precio de cada variación se re-resuelve contra el catálogo: lo que
    // haya mandado el navegador se descarta por completo.
    item.modificadores = resolverModificadores(producto, item.modificadores)
    if (!item.estadoItem) item.estadoItem = 'pendiente'
  }
}

/** Folio consecutivo, precios desde el catálogo y totales siempre recalculados. */
export const prepararPedido: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const entrante = data as PedidoData
  const previo = (originalDoc ?? {}) as PedidoData

  const estadoEntrante = (entrante.estado ?? previo.estado ?? 'nuevo') as string
  const estadoPrevio = previo.estado ?? null

  // El borrador de una mesa no es todavía una cuenta: no lleva folio. Se le
  // asigna al enviarlo, para que los folios salgan consecutivos sin huecos.
  const enviandoBorrador =
    operation === 'update' && estadoPrevio === 'borrador' && estadoEntrante !== 'borrador'

  if (
    (operation === 'create' || enviandoBorrador) &&
    !entrante.folio &&
    estadoEntrante !== 'borrador'
  ) {
    const canal = (entrante.canal ?? 'mesa') as Canal
    const prefijo = prefijoDeFolio(canal)

    const { docs: ultimos } = await req.payload.find({
      collection: 'pedidos',
      where: { folio: { like: `${prefijo}-` } },
      sort: '-folio',
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })

    entrante.folio = folioSiguiente(prefijo, ultimos[0]?.folio)
  }

  const itemsProvistos = Array.isArray(entrante.items) ? entrante.items : null
  if (itemsProvistos && itemsProvistos.length > 0) {
    await completarItems(req.payload, itemsProvistos, req)
  }

  entrante.descuento = entrante.descuento ?? previo.descuento ?? 0
  entrante.propina = entrante.propina ?? previo.propina ?? 0

  const ajustes = (await req.payload.findGlobal({ slug: 'ajustes', depth: 0 })) as {
    impuestoPorcentaje?: number
    impuestoIncluido?: boolean
  } | null

  const fuente: PedidoData = itemsProvistos
    ? entrante
    : { ...entrante, items: previo.items ?? [] }

  const totales = calcularTotales(fuente, {
    impuestoPorcentaje: ajustes?.impuestoPorcentaje ?? 0,
    impuestoIncluido: ajustes?.impuestoIncluido !== false,
  })

  entrante.subtotal = totales.subtotal
  entrante.impuesto = totales.impuesto
  entrante.total = totales.total
  entrante.descuento = totales.descuento

  const itemsParaCosto = itemsProvistos ?? previo.items ?? []
  if (itemsParaCosto.length > 0 && (itemsProvistos || operation === 'create')) {
    entrante.costoEstimado = await costoDePedido(
      req.payload,
      { items: itemsParaCosto },
      req,
    )
  }

  return data
}

/**
 * Suma puntos de lealtad y actualiza el historial del cliente.
 *
 * Se exporta porque el cobro de una mesa entera reparte los puntos por cliente
 * una sola vez, en lugar de una vez por ronda.
 */
export async function otorgarPuntosDeLealtad(
  payload: Payload,
  entrada: { clienteId: string | number; total: number },
  req?: Partial<PayloadRequest>,
): Promise<void> {
  const clienteId = entrada.clienteId
  if (!clienteId) return

  const total = entrada.total ?? 0

  const ajustes = (await payload.findGlobal({ slug: 'ajustes', depth: 0 })) as {
    puntosPorUnidad?: number
  } | null

  const puntos = Math.floor(total * (ajustes?.puntosPorUnidad ?? 1))
  if (puntos <= 0) return

  const cliente = (await payload.findByID({
    collection: 'clientes',
    id: idNumero(clienteId),
    depth: 0,
    overrideAccess: true,
    req,
  })) as {
    puntos?: number
    visitas?: number
    totalGastado?: number
  } | null

  if (!cliente) return

  await payload.update({
    collection: 'clientes',
    id: idNumero(clienteId),
    data: {
      puntos: (cliente.puntos ?? 0) + puntos,
      visitas: (cliente.visitas ?? 0) + 1,
      totalGastado: redondear((cliente.totalGastado ?? 0) + total),
      ultimaVisita: new Date().toISOString(),
    },
    overrideAccess: true,
    req,
  })
}

/** Mantiene el estado de la mesa alineado con el pedido. */
async function sincronizarMesa(
  payload: Payload,
  pedido: PedidoData,
  req?: Partial<PayloadRequest>,
): Promise<void> {
  // Cuando el pedido pertenece a una sesión, la mesa la gobierna la sesión: se
  // marca ocupada al abrirla y sólo se libera cuando la cuenta se cierra.
  if (pedido.sesion) return

  const mesaId = idCrudo(pedido.mesa)
  if (!mesaId) return

  const estadoPedido = pedido.estado ?? 'nuevo'
  let deseado: 'limpieza' | 'ocupada' | undefined

  if (estadoPedido === 'pagado' || estadoPedido === 'cancelado') {
    deseado = 'limpieza'
  } else if (ESTADOS_EN_MESA.includes(estadoPedido)) {
    deseado = 'ocupada'
  }

  if (!deseado) return

  const mesa = (await payload.findByID({
    collection: 'mesas',
    id: mesaId,
    depth: 0,
    overrideAccess: true,
    req,
  })) as { estado?: string } | null

  if (!mesa || mesa.estado === deseado) return

  await payload.update({
    collection: 'mesas',
    id: idNumero(mesaId),
    data: { estado: deseado },
    overrideAccess: true,
    req,
  })
}

/**
 * Efectos de negocio de un pedido: consumo de inventario, devolución por
 * cancelación, puntos de lealtad y estado de la mesa.
 */
export const efectosDePedido: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
  context,
}) => {
  if (context?.omitirEfectos) return doc

  const payload = req.payload
  const pedido = doc as unknown as PedidoData
  const estadoAnterior = (previousDoc as PedidoData | undefined)?.estado
  const estadoActual = pedido.estado ?? 'nuevo'
  const usuarioId = req.user?.id

  // Inventario: el consumo y la devolución tienen que ser exactamente
  // complementarios. Un pedido que espera al mesero (`por_confirmar`) no ha
  // tocado el almacén, así que rechazarlo tampoco debe devolver nada.
  const descontadoAntes = consumeInventario(estadoAnterior)
  const descuentaAhora = consumeInventario(estadoActual)

  // Alta directa desde el POS, o desde el QR cuando la compuerta está apagada.
  if (operation === 'create' && descuentaAhora) {
    await moverInventarioDePedido(payload, pedido, { req, usuarioId })
  }

  // Aprobación del mesero: recién al salir de `por_confirmar` se descuenta.
  if (operation === 'update' && estadoAnterior === 'por_confirmar' && descuentaAhora) {
    await moverInventarioDePedido(payload, pedido, { req, usuarioId })
  }

  // Envío del borrador de una mesa cuando la compuerta de aprobación está
  // apagada: el pedido pasa de `borrador` a `nuevo` y hay que descontar ahí.
  if (operation === 'update' && estadoAnterior === 'borrador' && descuentaAhora) {
    await moverInventarioDePedido(payload, pedido, { req, usuarioId })
  }

  // Cancelación o rechazo: sólo se devuelve lo que de verdad se descontó.
  if (
    operation === 'update' &&
    estadoActual === 'cancelado' &&
    estadoAnterior !== 'cancelado' &&
    descontadoAntes
  ) {
    await moverInventarioDePedido(payload, pedido, { revertir: true, req, usuarioId })
  }

  // Al cobrar una mesa entera los puntos se otorgan por cliente y una sola vez:
  // el cobro pasa `omitirPuntos` en todas las rondas menos en la última.
  if (pedido.estado === 'pagado' && estadoAnterior !== 'pagado' && !context?.omitirPuntos) {
    const clienteId = idCrudo(pedido.cliente)
    if (clienteId) {
      await otorgarPuntosDeLealtad(payload, { clienteId, total: pedido.total ?? 0 }, req)
    }
  }

  await sincronizarMesa(payload, pedido, req)

  if (pedido.sesion) {
    await cerrarSesionSiCorresponde(payload, idNumero(claveDe(pedido.sesion)), req)
  }

  return doc
}

/**
 * Cierra la sesión de una mesa cuando ya no le queda nada vivo: ni rondas
 * activas ni borrador. Una sesión con comida en cocina, o con platillos sin
 * enviar, sigue abierta.
 */
export async function cerrarSesionSiCorresponde(
  payload: Payload,
  sesionId: number,
  req?: Partial<PayloadRequest>,
): Promise<void> {
  if (!Number.isFinite(sesionId)) return

  const { totalDocs } = await payload.count({
    collection: 'pedidos',
    where: {
      sesion: { equals: sesionId },
      estado: { in: ESTADOS_QUE_MANTIENEN_LA_MESA },
    },
    overrideAccess: true,
    req,
  })

  if (totalDocs > 0) return

  let sesion: { id: string | number; estado?: string | null; mesa?: unknown } | null = null
  try {
    sesion = (await payload.findByID({
      collection: 'sesiones-mesa',
      id: sesionId,
      depth: 0,
      overrideAccess: true,
      req,
    })) as { id: string | number; estado?: string | null; mesa?: unknown } | null
  } catch {
    return
  }

  if (!sesion || sesion.estado !== 'abierta') return

  // ¿Alguien pagó? Entonces la mesa terminó y hay que limpiarla. Si se cerró
  // porque se canceló todo, la mesa sigue ocupada: los comensales están ahí.
  const { totalDocs: pagados } = await payload.count({
    collection: 'pedidos',
    where: { sesion: { equals: sesionId }, estado: { equals: 'pagado' } },
    overrideAccess: true,
    req,
  })

  const cobrada = pagados > 0

  // Sin sesión abierta, su borrador ya no lo puede mandar nadie.
  await descartarBorradoresDeSesion(payload, sesionId)

  await payload.update({
    collection: 'sesiones-mesa',
    id: sesionId,
    data: {
      estado: 'cerrada',
      cerradaEn: new Date().toISOString(),
      motivoCierre: cobrada ? 'cobrada' : 'manual',
    } as never,
    overrideAccess: true,
    req,
  })

  const mesaId = idCrudo(sesion.mesa)
  if (cobrada && mesaId) {
    await payload.update({
      collection: 'mesas',
      id: idNumero(mesaId),
      data: { estado: 'limpieza' } as never,
      overrideAccess: true,
      req,
    })
  }
}
