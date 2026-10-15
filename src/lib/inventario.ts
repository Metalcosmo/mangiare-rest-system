import type { Payload, PayloadRequest } from 'payload'

import { claveDe, idCrudo, idNumero } from './ids'
import { convertir, type Unidad } from './unidades'

export type TipoMovimiento =
  | 'entrada'
  | 'salida'
  | 'ajuste'
  | 'merma'
  | 'consumo'
  | 'devolucion'

/** Signo que aplica cada tipo de movimiento sobre la existencia. */
export const signoMovimiento = (tipo: TipoMovimiento): number =>
  tipo === 'salida' || tipo === 'merma' || tipo === 'consumo' ? -1 : 1

export const redondear = (valor: number, decimales = 2): number => {
  const factor = 10 ** decimales
  return Math.round((valor + Number.EPSILON) * factor) / factor
}

type RefIngrediente = {
  id: string | number
  nombre?: string
  unidad?: string
  costoUnitario?: number
}

type LineaReceta = {
  ingrediente?: string | number | RefIngrediente
  cantidad?: number
  unidad?: string
}

type ProductoConReceta = {
  id: string | number
  controlaStock?: boolean
  rendimiento?: number
  receta?: LineaReceta[]
}

type ItemPedido = {
  producto?: unknown
  cantidad?: number | null
}

type PedidoLike = {
  id?: string | number
  folio?: string
  items?: ItemPedido[]
}

type AplicarArgs = {
  payload: Payload
  ingredienteId: string | number
  tipo: TipoMovimiento
  cantidad: number
  req?: Partial<PayloadRequest>
}

/**
 * Actualiza la existencia del ingrediente según el tipo de movimiento.
 * Un `ajuste` fija la existencia al valor indicado; el resto suma o resta.
 */
export async function aplicarMovimientoAlStock({
  payload,
  ingredienteId,
  tipo,
  cantidad,
  req,
}: AplicarArgs): Promise<void> {
  const ingrediente = await payload.findByID({
    collection: 'ingredientes',
    id: ingredienteId,
    depth: 0,
    overrideAccess: true,
    req,
  })

  const anterior = (ingrediente as { stockActual?: number })?.stockActual ?? 0
  const nuevo = tipo === 'ajuste' ? cantidad : anterior + signoMovimiento(tipo) * cantidad

  await payload.update({
    collection: 'ingredientes',
    id: ingredienteId,
    data: { stockActual: redondear(nuevo, 3) },
    overrideAccess: true,
    req,
  })
}

type RegistrarArgs = AplicarArgs & {
  motivo?: string
  costoUnitario?: number
  pedidoId?: string | number
  usuarioId?: string | number
}

/**
 * Registra un movimiento en el libro de inventario y actualiza la existencia.
 * Se usa desde el panel, desde el POS y desde el consumo automático de recetas.
 */
export async function registrarMovimiento({
  payload,
  ingredienteId,
  tipo,
  cantidad,
  motivo,
  costoUnitario,
  pedidoId,
  usuarioId,
  req,
}: RegistrarArgs): Promise<void> {
  await payload.create({
    collection: 'movimientos-inventario',
    data: {
      ingrediente: idNumero(ingredienteId),
      tipo,
      cantidad,
      motivo,
      costoUnitario,
      pedido: pedidoId === undefined ? undefined : idNumero(pedidoId),
      usuario: usuarioId === undefined ? undefined : idNumero(usuarioId),
    } as never,
    context: { stockYaAplicado: true },
    overrideAccess: true,
    req,
  })

  await aplicarMovimientoAlStock({ payload, ingredienteId, tipo, cantidad, req })
}

/** Consolida el consumo de ingredientes de todos los platillos de un pedido. */
async function calcularConsumo(
  payload: Payload,
  pedido: PedidoLike,
  req?: Partial<PayloadRequest>,
): Promise<
  Array<{ ingredienteId: string | number; nombre: string; cantidad: number; costoUnitario: number }>
> {
  const items = pedido.items ?? []
  const productoIds = [
    ...new Set(
      items
        .map((item) => idCrudo(item.producto))
        .filter((id): id is string | number => id !== undefined),
    ),
  ]
  if (productoIds.length === 0) return []

  const { docs } = await payload.find({
    collection: 'productos',
    where: { id: { in: productoIds } },
    depth: 1,
    limit: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })

  const productos = docs as unknown as ProductoConReceta[]
  const porId = new Map(productos.map((producto) => [String(producto.id), producto]))
  const acumulado = new Map<
    string,
    { ingredienteId: string | number; nombre: string; cantidad: number; costoUnitario: number }
  >()

  for (const item of items) {
    const producto = porId.get(claveDe(item.producto))
    if (!producto || producto.controlaStock === false) continue

    const rendimiento = Math.max(1, producto.rendimiento ?? 1)

    for (const linea of producto.receta ?? []) {
      const ingrediente = linea.ingrediente
      if (!ingrediente || typeof ingrediente !== 'object') continue

      const unidadInventario = (ingrediente.unidad ?? 'unidad') as Unidad
      const unidadReceta = (linea.unidad ?? unidadInventario) as Unidad
      const cantidadPorPorcion =
        convertir(linea.cantidad ?? 0, unidadReceta, unidadInventario) / rendimiento
      const cantidadTotal = cantidadPorPorcion * (item.cantidad ?? 1)

      const clave = String(ingrediente.id)
      const previo = acumulado.get(clave)
      if (previo) {
        previo.cantidad += cantidadTotal
      } else {
        acumulado.set(clave, {
          ingredienteId: ingrediente.id,
          nombre: ingrediente.nombre ?? 'Ingrediente',
          cantidad: cantidadTotal,
          costoUnitario: ingrediente.costoUnitario ?? 0,
        })
      }
    }
  }

  return [...acumulado.values()]
}

/** Costo teórico de los ingredientes consumidos por un pedido. */
export async function costoDePedido(
  payload: Payload,
  pedido: PedidoLike,
  req?: Partial<PayloadRequest>,
): Promise<number> {
  const consumo = await calcularConsumo(payload, pedido, req)
  return redondear(
    consumo.reduce((total, linea) => total + linea.cantidad * linea.costoUnitario, 0),
  )
}

/**
 * Descuenta del inventario los ingredientes de un pedido.
 * `revertir = true` devuelve los ingredientes (pedidos cancelados).
 */
export async function moverInventarioDePedido(
  payload: Payload,
  pedido: PedidoLike,
  opciones: { revertir?: boolean; req?: Partial<PayloadRequest>; usuarioId?: string | number } = {},
): Promise<void> {
  const { revertir = false, req, usuarioId } = opciones
  const consumo = await calcularConsumo(payload, pedido, req)

  for (const linea of consumo) {
    if (linea.cantidad <= 0) continue
    await registrarMovimiento({
      payload,
      ingredienteId: linea.ingredienteId,
      tipo: revertir ? 'devolucion' : 'consumo',
      cantidad: redondear(linea.cantidad, 3),
      costoUnitario: linea.costoUnitario,
      motivo: revertir
        ? `Devolución por cancelación del pedido ${pedido.folio ?? pedido.id ?? ''}`
        : `Consumo del pedido ${pedido.folio ?? pedido.id ?? ''}`,
      pedidoId: pedido.id,
      usuarioId,
      req,
    })
  }
}
