// @vitest-environment node
/**
 * Pruebas de integración: cargan Payload real contra la base local de D1 y
 * validan la lógica de negocio (totales, unidades, lealtad).
 *
 * El entorno debe ser `node`: el bundle de `wrangler` que usa el adaptador de
 * D1 no funciona bajo jsdom.
 */
import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { calcularTotales } from '@/lib/pedidos'
import { convertir } from '@/lib/unidades'
import { nivelPorGasto } from '@/hooks/clientes'

let payload: Payload

describe('API de Payload', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  })

  it('expone la colección de usuarios', async () => {
    const usuarios = await payload.find({ collection: 'users', overrideAccess: true })
    expect(usuarios).toBeDefined()
  })

  it('la carta tiene platillos con slug y precio', async () => {
    const { docs } = await payload.find({
      collection: 'productos',
      limit: 5,
      overrideAccess: true,
    })

    expect(docs.length).toBeGreaterThan(0)
    for (const producto of docs) {
      expect(producto.slug).toBeTruthy()
      expect(typeof producto.precio).toBe('number')
    }
  })

  it('cada mesa tiene un slug utilizable en el código QR', async () => {
    const { docs } = await payload.find({ collection: 'mesas', overrideAccess: true })
    expect(docs.length).toBeGreaterThan(0)

    for (const mesa of docs) {
      expect(mesa.slug).toMatch(/^[a-z0-9-]+$/)
    }
  })

  it('los platillos con receta tienen costo calculado', async () => {
    const { docs } = await payload.find({
      collection: 'productos',
      where: { controlaStock: { equals: true } },
      limit: 5,
      overrideAccess: true,
    })

    expect(docs.length).toBeGreaterThan(0)
    for (const producto of docs) {
      expect(producto.costoReceta ?? 0).toBeGreaterThan(0)
      expect(producto.costoReceta ?? 0).toBeLessThan(producto.precio)
    }
  })
})

describe('Cálculo de totales del pedido', () => {
  const items = [
    { cantidad: 2, precioUnitario: 100 },
    { cantidad: 1, precioUnitario: 50, modificadores: [{ precioExtra: 25 }] },
  ]

  it('desglosa el impuesto cuando ya está incluido en el precio', () => {
    const pedido = { items: items.map((item) => ({ ...item })), descuento: 0, propina: 0 }
    const totales = calcularTotales(pedido, {
      impuestoPorcentaje: 16,
      impuestoIncluido: true,
    })

    expect(totales.subtotal).toBe(275)
    expect(totales.total).toBe(275)
    expect(totales.impuesto).toBeCloseTo(37.93, 1)
  })

  it('suma el impuesto cuando los precios no lo incluyen', () => {
    const pedido = { items: items.map((item) => ({ ...item })), descuento: 0, propina: 0 }
    const totales = calcularTotales(pedido, {
      impuestoPorcentaje: 16,
      impuestoIncluido: false,
    })

    expect(totales.subtotal).toBe(275)
    expect(totales.impuesto).toBe(44)
    expect(totales.total).toBe(319)
  })

  it('aplica descuento antes del impuesto y suma la propina', () => {
    const pedido = {
      items: [{ cantidad: 1, precioUnitario: 200 }],
      descuento: 50,
      propina: 20,
    }
    const totales = calcularTotales(pedido, {
      impuestoPorcentaje: 16,
      impuestoIncluido: false,
    })

    expect(totales.subtotal).toBe(200)
    expect(totales.descuento).toBe(50)
    expect(totales.impuesto).toBe(24)
    expect(totales.total).toBe(194)
  })

  it('nunca deja el descuento por encima del subtotal', () => {
    const pedido = { items: [{ cantidad: 1, precioUnitario: 80 }], descuento: 500 }
    const totales = calcularTotales(pedido, { impuestoPorcentaje: 0, impuestoIncluido: true })
    expect(totales.descuento).toBe(80)
    expect(totales.total).toBe(0)
  })

  it('calcula subtotales por línea con extras', () => {
    const items: Array<{
      cantidad: number
      precioUnitario: number
      modificadores?: Array<{ precioExtra: number }>
      subtotal?: number
    }> = [{ cantidad: 3, precioUnitario: 100, modificadores: [{ precioExtra: 25 }] }]
    const pedido = { items }
    calcularTotales(pedido, { impuestoPorcentaje: 0, impuestoIncluido: true })
    expect(pedido.items[0].subtotal).toBe(375)
  })
})

describe('Conversión de unidades del inventario', () => {
  it('convierte gramos a kilogramos', () => {
    expect(convertir(200, 'g', 'kg')).toBeCloseTo(0.2, 5)
  })

  it('convierte litros a mililitros', () => {
    expect(convertir(1.5, 'l', 'ml')).toBe(1500)
  })

  it('deja la cantidad intacta entre familias distintas', () => {
    expect(convertir(3, 'unidad', 'kg')).toBe(3)
  })
})

describe('Niveles de lealtad', () => {
  it('sube de nivel según el gasto histórico', () => {
    expect(nivelPorGasto(0, 0)).toBe('bronce')
    expect(nivelPorGasto(3000, 5)).toBe('plata')
    expect(nivelPorGasto(9000, 12)).toBe('oro')
    expect(nivelPorGasto(25000, 30)).toBe('platino')
  })

  it('premia la frecuencia aunque el ticket sea bajo', () => {
    expect(nivelPorGasto(500, 20)).toBe('plata')
    expect(nivelPorGasto(500, 50)).toBe('oro')
  })
})
