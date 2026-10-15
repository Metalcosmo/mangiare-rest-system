// @vitest-environment node
/**
 * Compuerta de aprobación: un pedido que llega de la carta QR nace en
 * `por_confirmar` y no debe tocar el inventario hasta que un mesero lo aprueba.
 *
 * Lo crítico aquí es que las tres transiciones sean complementarias:
 *   crear → por_confirmar   (no consume)
 *   por_confirmar → nuevo   (consume)
 *   por_confirmar → cancelado (no devuelve nada, porque nunca consumió)
 *
 * El entorno debe ser `node`: el bundle de `wrangler` que usa el adaptador de
 * D1 no funciona bajo jsdom.
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { ESTADOS_CON_CONSUMO, consumeInventario, estaPorConfirmar } from '@/lib/pedidos'
import { idCrudo } from '@/lib/ids'

let payload: Payload

/** Pedidos creados por las pruebas, para limpiarlos al final. */
const CREADOS: Array<string | number> = []

type LineaReceta = { ingrediente?: unknown }

/** Existencias actuales de cada ingrediente de la receta de un platillo. */
async function stocksDeReceta(productoId: string | number): Promise<Map<string, number>> {
  const producto = (await payload.findByID({
    collection: 'productos',
    id: productoId,
    depth: 0,
    overrideAccess: true,
  })) as { receta?: LineaReceta[] | null }

  const ids = (producto.receta ?? [])
    .map((linea) => idCrudo(linea.ingrediente))
    .filter((id): id is string | number => id !== undefined)

  if (ids.length === 0) return new Map()

  const { docs } = await payload.find({
    collection: 'ingredientes',
    where: { id: { in: ids } },
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: true,
  })

  return new Map(
    (docs as unknown as Array<{ id: string | number; stockActual?: number | null }>).map((doc) => [
      String(doc.id),
      doc.stockActual ?? 0,
    ]),
  )
}

/** Crea un pedido de prueba con un platillo de la receta elegida. */
async function crearPedido(estado: string, productoId: string | number, cantidad = 1) {
  const pedido = await payload.create({
    collection: 'pedidos',
    overrideAccess: true,
    data: {
      canal: 'mesa',
      estado,
      comensales: 2,
      items: [{ producto: productoId, cantidad }],
    } as never,
  })

  CREADOS.push(pedido.id)
  return pedido
}

const cambiarEstado = (id: string | number, estado: string) =>
  payload.update({
    collection: 'pedidos',
    id,
    data: { estado } as never,
    overrideAccess: true,
  })

/** ¿Bajó al menos un ingrediente respecto a la referencia? */
const algoBajo = (antes: Map<string, number>, despues: Map<string, number>): boolean =>
  [...antes].some(([clave, valor]) => (despues.get(clave) ?? 0) < valor - 1e-6)

const ningunoSubio = (antes: Map<string, number>, despues: Map<string, number>): boolean =>
  [...antes].every(([clave, valor]) => (despues.get(clave) ?? 0) <= valor + 1e-6)

const todosIguales = (antes: Map<string, number>, despues: Map<string, number>): boolean =>
  [...antes].every(([clave, valor]) => Math.abs((despues.get(clave) ?? 0) - valor) < 1e-3)

describe('Compuerta de aprobación del mesero', () => {
  let productoId: string | number | null = null

  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })

    // Necesitamos un platillo que controle stock y tenga receta con ingredientes.
    const { docs } = await payload.find({
      collection: 'productos',
      where: { controlaStock: { equals: true } },
      depth: 0,
      limit: 50,
      overrideAccess: true,
    })

    const conReceta = (docs as unknown as Array<{ id: string | number; receta?: unknown[] }>).find(
      (doc) => (doc.receta ?? []).length > 0,
    )
    productoId = conReceta?.id ?? null
  })

  afterAll(async () => {
    // Los pedidos de prueba ya quedaron cancelados y el inventario cuadrado:
    // borrarlos no altera existencias (el hook sólo revierte al cancelar).
    for (const id of CREADOS) {
      try {
        await payload.delete({ collection: 'pedidos', id, overrideAccess: true })
      } catch {
        // Si ya no existe, no hay nada que limpiar.
      }
    }
  })

  it('un pedido por confirmar no toca el inventario', async () => {
    if (!productoId) return

    const antes = await stocksDeReceta(productoId)
    expect(antes.size).toBeGreaterThan(0)

    const pedido = await crearPedido('por_confirmar', productoId)

    const despues = await stocksDeReceta(productoId)
    expect(todosIguales(antes, despues)).toBe(true)
    // Todavía no se marcó el envío a cocina.
    expect((pedido as { horaEnvioCocina?: string | null }).horaEnvioCocina ?? null).toBeNull()
  })

  it('al aprobar el pedido recién se descuenta, y cancelar lo devuelve', async () => {
    if (!productoId) return

    const antes = await stocksDeReceta(productoId)

    const pedido = await crearPedido('por_confirmar', productoId)
    await cambiarEstado(pedido.id, 'nuevo')

    const consumido = await stocksDeReceta(productoId)
    expect(algoBajo(antes, consumido)).toBe(true)
    expect(ningunoSubio(antes, consumido)).toBe(true)

    // Cancelar después de aprobar sí debe devolver lo consumido.
    await cambiarEstado(pedido.id, 'cancelado')
    const devuelto = await stocksDeReceta(productoId)
    expect(todosIguales(antes, devuelto)).toBe(true)
  })

  it('rechazar un pedido pendiente no devuelve inventario', async () => {
    if (!productoId) return

    const antes = await stocksDeReceta(productoId)

    const pedido = await crearPedido('por_confirmar', productoId)
    await cambiarEstado(pedido.id, 'cancelado')

    const despues = await stocksDeReceta(productoId)
    // Nunca se descontó, así que devolverlo inflaría el almacén.
    expect(todosIguales(antes, despues)).toBe(true)
  })

  it('un pedido creado directo a cocina consume y al cancelar devuelve', async () => {
    if (!productoId) return

    const antes = await stocksDeReceta(productoId)

    const pedido = await crearPedido('nuevo', productoId)
    const consumido = await stocksDeReceta(productoId)
    expect(algoBajo(antes, consumido)).toBe(true)

    await cambiarEstado(pedido.id, 'cancelado')
    const devuelto = await stocksDeReceta(productoId)
    expect(todosIguales(antes, devuelto)).toBe(true)
  })

  it('el pedido nace con folio y total calculados por el hook', async () => {
    if (!productoId) return

    const pedido = await crearPedido('por_confirmar', productoId, 2)
    expect((pedido as { folio?: string }).folio).toMatch(/^M-\d{4}$/)
    expect((pedido as { total?: number }).total ?? 0).toBeGreaterThan(0)
  })
})

describe('Predicado de consumo de inventario', () => {
  it('deja fuera lo que espera al mesero y lo cancelado', () => {
    expect(consumeInventario('por_confirmar')).toBe(false)
    expect(consumeInventario('cancelado')).toBe(false)
    expect(consumeInventario(undefined)).toBe(false)
    expect(consumeInventario(null)).toBe(false)
  })

  it('marca como consumidos los estados que ya fueron a cocina', () => {
    for (const estado of ESTADOS_CON_CONSUMO) {
      expect(consumeInventario(estado)).toBe(true)
    }
  })

  it('reconoce el estado pendiente de confirmación', () => {
    expect(estaPorConfirmar('por_confirmar')).toBe(true)
    expect(estaPorConfirmar('nuevo')).toBe(false)
    expect(estaPorConfirmar(null)).toBe(false)
  })
})
