// @vitest-environment node
/**
 * Mesa con anfitrión: la cuenta compartida de una mesa.
 *
 * Lo que se prueba aquí es la lógica que sostiene el flujo del QR:
 *
 *   abrir la mesa → pedir con la cédula del anfitrión → mandar al mesero
 *
 * El candado de la mesa es la **sesión** (sólo entra quien tiene la cookie), y
 * la **cuenta** es la mesa: por eso varias rondas y un borrador conviven sin
 * partir el cobro.
 *
 * El entorno debe ser `node`: el bundle de `wrangler` que usa el adaptador de
 * D1 no funciona bajo jsdom.
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import {
  agregarLinea,
  borradorDeSesion,
  cambiarCantidad,
  descartarBorrador,
  descartarBorradoresDeSesion,
  enviarBorrador,
  quitarLinea,
} from '@/lib/borrador'
import { distribuirPagos } from '@/lib/cuenta'
import { idCrudo } from '@/lib/ids'
import {
  abrirSesion,
  abrirSesionDeMesero,
  coincideCedula,
  normalizarCedula,
  reclamarSesion,
  rolDeToken,
  sesionAbiertaDeMesa,
  type SesionMesa,
} from '@/lib/mesa-sesion'
import { cerrarSesionSiCorresponde } from '@/hooks/pedidos'

let payload: Payload

const SESIONES: Array<string | number> = []
const PEDIDOS: Array<string | number> = []

let mesaId: string | number
let productoSuelto: string | number
let productoConStock: string | number

type Receta = { ingrediente?: unknown }

/** Existencias de cada ingrediente de la receta de un platillo. */
async function stocksDeReceta(productoId: string | number): Promise<Map<string, number>> {
  const producto = (await payload.findByID({
    collection: 'productos',
    id: productoId,
    depth: 0,
    overrideAccess: true,
  })) as { receta?: Receta[] | null }

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

const algoBajo = (antes: Map<string, number>, despues: Map<string, number>): boolean =>
  [...antes].some(([clave, valor]) => (despues.get(clave) ?? 0) < valor - 1e-6)

const todosIguales = (antes: Map<string, number>, despues: Map<string, number>): boolean =>
  [...antes].every(([clave, valor]) => Math.abs((despues.get(clave) ?? 0) - valor) < 1e-3)

/**
 * Deja la mesa de pruebas sin sesiones: cada prueba abre la suya y así ninguna
 * depende del orden en que corran.
 */
async function limpiarMesa(): Promise<void> {
  const { docs } = await payload.find({
    collection: 'sesiones-mesa',
    where: { mesa: { equals: mesaId } },
    depth: 0,
    limit: 100,
    pagination: false,
    overrideAccess: true,
  })

  for (const sesion of docs) {
    const { docs: pedidos } = await payload.find({
      collection: 'pedidos',
      where: { sesion: { equals: Number(sesion.id) } },
      depth: 0,
      limit: 100,
      pagination: false,
      overrideAccess: true,
    })

    for (const pedido of pedidos) {
      await payload.delete({ collection: 'pedidos', id: pedido.id, overrideAccess: true })
    }

    await payload.delete({ collection: 'sesiones-mesa', id: sesion.id, overrideAccess: true })
  }
}

/** Abre una mesa de prueba con una cédula propia. */
async function abrirMesaDePrueba(cedula = `T${Date.now()}`): Promise<SesionMesa> {
  await limpiarMesa()

  const resultado = await abrirSesion(payload, {
    mesa: mesaId,
    nombre: 'Prueba Automática',
    cedula,
  })

  expect(resultado.error).toBeUndefined()
  const sesion = resultado.sesion!
  SESIONES.push(sesion.id)

  const { docs } = await payload.find({
    collection: 'pedidos',
    where: { sesion: { equals: Number(sesion.id) } },
    depth: 0,
    limit: 100,
    pagination: false,
    overrideAccess: true,
  })
  for (const pedido of docs) PEDIDOS.push(pedido.id)

  return sesion
}

const pedidosDe = async (sesionId: string | number) => {
  const { docs } = await payload.find({
    collection: 'pedidos',
    where: { sesion: { equals: Number(sesionId) } },
    depth: 0,
    limit: 100,
    pagination: false,
    sort: 'id',
    overrideAccess: true,
  })
  return docs as unknown as Array<Record<string, unknown>>
}

describe('Sesiones de mesa y pedido compartido', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })

    // Una mesa libre: la sembrada con la sesión de demostración usa otra.
    const { docs: mesas } = await payload.find({
      collection: 'mesas',
      where: { activa: { equals: true }, estado: { equals: 'libre' } },
      depth: 0,
      limit: 1,
      overrideAccess: true,
    })
    mesaId = mesas[0].id

    const { docs: productos } = await payload.find({
      collection: 'productos',
      where: { disponible: { equals: true } },
      depth: 1,
      limit: 100,
      overrideAccess: true,
    })

    const catalogo = productos as unknown as Array<{
      id: string | number
      controlaStock?: boolean
      receta?: unknown[]
      gruposModificadores?: unknown[]
    }>

    const sinOpciones = catalogo.find((producto) => (producto.gruposModificadores ?? []).length === 0)
    const conStock = catalogo.find(
      (producto) => producto.controlaStock && (producto.receta ?? []).length > 0,
    )

    productoSuelto = sinOpciones!.id
    productoConStock = (conStock ?? sinOpciones)!.id
  })

  afterAll(async () => {
    for (const id of PEDIDOS) {
      try {
        await payload.delete({ collection: 'pedidos', id, overrideAccess: true })
      } catch {
        // Ya no existe.
      }
    }
    for (const id of SESIONES) {
      try {
        await payload.delete({ collection: 'sesiones-mesa', id, overrideAccess: true })
      } catch {
        // Ya no existe.
      }
    }
  })

  // ── Identidad ─────────────────────────────────────────────────────────────
  it('normaliza la cédula para que todas sus formas sean la misma', () => {
    expect(normalizarCedula('V-12.345.678')).toBe('V12345678')
    expect(normalizarCedula(' v12345678 ')).toBe('V12345678')
    expect(normalizarCedula('12 345 678')).toBe('12345678')
    expect(normalizarCedula(null)).toBe('')
  })

  it('el rol sale del token, nunca de una bandera que el cliente pueda cambiar', () => {
    const sesion = {
      id: 1,
      tokenAnfitrion: 'anfitrion-abc',
      tokenInvitado: 'invitado-xyz',
    } as SesionMesa

    expect(rolDeToken(sesion, 'anfitrion-abc')).toBe('anfitrion')
    expect(rolDeToken(sesion, 'invitado-xyz')).toBe('invitado')
    expect(rolDeToken(sesion, 'otra-cosa')).toBeNull()
    expect(rolDeToken(sesion, null)).toBeNull()
  })

  it('sólo la cédula del anfitrión abre la mesa', async () => {
    const sesion = await abrirMesaDePrueba('V99887766')

    expect(coincideCedula(sesion, 'v-99.887.766')).toBe(true)
    expect(coincideCedula(sesion, 'V00000000')).toBe(false)
    expect(coincideCedula({ anfitrionCedula: null }, 'V99887766')).toBe(false)
  })

  it('abrir una mesa ya abierta no crea otra sesión ni cierra la primera', async () => {
    const primera = await abrirMesaDePrueba()

    const segunda = await abrirSesion(payload, {
      mesa: mesaId,
      nombre: 'Otra Persona',
      cedula: 'V11112222',
    })

    expect(segunda.error).toBeTruthy()
    expect(segunda.sesion).toBeUndefined()

    const vigente = await sesionAbiertaDeMesa(payload, mesaId)
    expect(String(vigente?.id)).toBe(String(primera.id))
    expect(vigente?.anfitrionNombre).toBe('Prueba Automática')
  })

  it('el mesero puede abrir la mesa sin cédula y el primer comensal la reclama', async () => {
    await limpiarMesa()

    const { sesion } = await abrirSesionDeMesero(payload, { mesa: mesaId, nombre: 'Mesero' })
    expect(sesion).toBeTruthy()
    SESIONES.push(sesion!.id)

    const sinCedula = await sesionAbiertaDeMesa(payload, mesaId)
    expect(sinCedula?.anfitrionCedula ?? null).toBeNull()

    const reclamada = await reclamarSesion(payload, sinCedula as SesionMesa, {
      nombre: 'Comensal',
      cedula: 'V55556666',
    })
    expect(reclamada.error).toBeUndefined()
    expect(reclamada.sesion?.anfitrionCedula).toBe('V55556666')

    // Ya con anfitrión, nadie más la reclama.
    const otra = await reclamarSesion(payload, reclamada.sesion as SesionMesa, {
      nombre: 'Intruso',
      cedula: 'V00000001',
    })
    expect(otra.error).toBeTruthy()
  })

  // ── Pedido compartido ─────────────────────────────────────────────────────
  it('el borrador nace con el primer platillo, sin folio y sin tocar inventario', async () => {
    const sesion = await abrirMesaDePrueba()
    const antes = await stocksDeReceta(productoConStock)

    const { borrador } = await agregarLinea(payload, {
      sesion,
      item: { producto: productoConStock, cantidad: 2, modificadores: [] },
    })
    PEDIDOS.push(borrador!.id)

    expect(borrador?.estado).toBe('borrador')
    expect(borrador?.folio ?? null).toBeNull()
    expect(borrador?.items).toHaveLength(1)
    expect((borrador?.items ?? [])[0].cantidad).toBe(2)

    const despues = await stocksDeReceta(productoConStock)
    expect(todosIguales(antes, despues)).toBe(true)
  })

  it('dos platillos iguales se suman en una línea y quitar la última borra el borrador', async () => {
    const sesion = await abrirMesaDePrueba()

    await agregarLinea(payload, {
      sesion,
      item: { producto: productoSuelto, cantidad: 1, modificadores: [] },
    })
    const segunda = await agregarLinea(payload, {
      sesion,
      item: { producto: productoSuelto, cantidad: 2, modificadores: [] },
    })

    const borrador = segunda.borrador!
    if (!PEDIDOS.includes(borrador.id)) PEDIDOS.push(borrador.id)

    expect(borrador.items).toHaveLength(1)
    expect(borrador.items?.[0].cantidad).toBe(3)

    // Cantidad a cero = quitar la línea; sin líneas, el borrador desaparece.
    const vacio = await cambiarCantidad(payload, {
      borradorId: borrador.id,
      indice: 0,
      delta: -3,
    })
    expect(vacio.error).toBeUndefined()
    expect(vacio.borrador).toBeUndefined()

    const despues = await borradorDeSesion(payload, sesion.id)
    expect(despues).toBeNull()
  })

  it('quitar una línea deja vivas las demás', async () => {
    const sesion = await abrirMesaDePrueba()

    await agregarLinea(payload, {
      sesion,
      item: { producto: productoSuelto, cantidad: 1, modificadores: [] },
    })
    await agregarLinea(payload, {
      sesion,
      item: { producto: productoSuelto, cantidad: 1, modificadores: [], notas: 'sin sal' },
    })

    const borrador = (await borradorDeSesion(payload, sesion.id))!
    if (!PEDIDOS.includes(borrador.id)) PEDIDOS.push(borrador.id)
    expect(borrador.items).toHaveLength(2)

    const resultado = await quitarLinea(payload, borrador.id, 0)
    expect(resultado.borrador?.items).toHaveLength(1)
  })

  it('enviar el borrador le pone folio, ronda 1 y lo deja esperando al mesero', async () => {
    const sesion = await abrirMesaDePrueba()

    await agregarLinea(payload, {
      sesion,
      item: { producto: productoConStock, cantidad: 1, modificadores: [] },
    })

    const borrador = (await borradorDeSesion(payload, sesion.id))!
    if (!PEDIDOS.includes(borrador.id)) PEDIDOS.push(borrador.id)

    const antes = await stocksDeReceta(productoConStock)
    const { borrador: enviado } = await enviarBorrador(payload, {
      borrador,
      sesionId: sesion.id,
      requiereAprobacion: true,
    })

    expect(enviado?.estado).toBe('por_confirmar')
    expect(enviado?.folio).toMatch(/^M-\d{4}$/)
    expect(enviado?.ronda).toBe(1)

    const doc = (await payload.findByID({
      collection: 'pedidos',
      id: enviado!.id,
      depth: 0,
      overrideAccess: true,
    })) as { horaEnvioCocina?: string | null; clienteNombre?: string | null }

    expect(doc.horaEnvioCocina ?? null).toBeNull()
    expect(doc.clienteNombre).toBe('Prueba Automática')

    // Sigue sin tocar el inventario: eso pasa al aprobar.
    const despues = await stocksDeReceta(productoConStock)
    expect(todosIguales(antes, despues)).toBe(true)
  })

  it('con la compuerta apagada, enviar el borrador ya descuenta inventario', async () => {
    const sesion = await abrirMesaDePrueba()

    await agregarLinea(payload, {
      sesion,
      item: { producto: productoConStock, cantidad: 1, modificadores: [] },
    })

    const borrador = (await borradorDeSesion(payload, sesion.id))!
    if (!PEDIDOS.includes(borrador.id)) PEDIDOS.push(borrador.id)

    const antes = await stocksDeReceta(productoConStock)
    const { borrador: enviado } = await enviarBorrador(payload, {
      borrador,
      sesionId: sesion.id,
      requiereAprobacion: false,
    })

    expect(enviado?.estado).toBe('nuevo')
    expect(enviado?.ronda).toBe(1)

    const despues = await stocksDeReceta(productoConStock)
    expect(algoBajo(antes, despues)).toBe(true)
  })

  it('la segunda ronda se numera aparte y no toca el inventario de la primera', async () => {
    const sesion = await abrirMesaDePrueba()

    await agregarLinea(payload, {
      sesion,
      item: { producto: productoSuelto, cantidad: 1, modificadores: [] },
    })
    const primera = (await borradorDeSesion(payload, sesion.id))!
    if (!PEDIDOS.includes(primera.id)) PEDIDOS.push(primera.id)

    await enviarBorrador(payload, { borrador: primera, sesionId: sesion.id, requiereAprobacion: true })

    // Aprobación: ahora sí entra a cocina.
    await payload.update({
      collection: 'pedidos',
      id: primera.id,
      data: { estado: 'nuevo' } as never,
      overrideAccess: true,
    })

    await agregarLinea(payload, {
      sesion,
      item: { producto: productoSuelto, cantidad: 1, modificadores: [] },
    })
    const segunda = (await borradorDeSesion(payload, sesion.id))!
    if (!PEDIDOS.includes(segunda.id)) PEDIDOS.push(segunda.id)

    const { borrador: enviada } = await enviarBorrador(payload, {
      borrador: segunda,
      sesionId: sesion.id,
      requiereAprobacion: true,
    })

    expect(enviada?.ronda).toBe(2)

    const rondas = await pedidosDe(sesion.id)
    expect(rondas.map((pedido) => pedido.ronda)).toEqual([1, 2])
  })

  it('el personal descarta lo que la mesa no mandó', async () => {
    const sesion = await abrirMesaDePrueba()

    await agregarLinea(payload, {
      sesion,
      item: { producto: productoSuelto, cantidad: 1, modificadores: [] },
    })
    const borrador = (await borradorDeSesion(payload, sesion.id))!

    const resultado = await descartarBorrador(payload, borrador.id)
    expect(resultado.error).toBeUndefined()
    expect(await borradorDeSesion(payload, sesion.id)).toBeNull()
  })

  // ── Ciclo de vida de la sesión ────────────────────────────────────────────
  it('la sesión no se cierra mientras haya un borrador vivo', async () => {
    const sesion = await abrirMesaDePrueba()

    await agregarLinea(payload, {
      sesion,
      item: { producto: productoSuelto, cantidad: 1, modificadores: [] },
    })
    const borrador = (await borradorDeSesion(payload, sesion.id))!
    if (!PEDIDOS.includes(borrador.id)) PEDIDOS.push(borrador.id)

    await cerrarSesionSiCorresponde(payload, Number(sesion.id))

    const vigente = await payload.findByID({
      collection: 'sesiones-mesa',
      id: sesion.id,
      depth: 0,
      overrideAccess: true,
    })
    expect((vigente as { estado?: string }).estado).toBe('abierta')
  })

  it('descartar el borrador cierra la sesión que ya no tiene nada vivo', async () => {
    const sesion = await abrirMesaDePrueba()

    // Una ronda enviada que después se cancela…
    await agregarLinea(payload, {
      sesion,
      item: { producto: productoSuelto, cantidad: 1, modificadores: [] },
    })
    const ronda = (await borradorDeSesion(payload, sesion.id))!
    if (!PEDIDOS.includes(ronda.id)) PEDIDOS.push(ronda.id)
    await enviarBorrador(payload, { borrador: ronda, sesionId: sesion.id, requiereAprobacion: true })

    // …y un borrador nuevo, que por sí solo mantiene la sesión abierta.
    await agregarLinea(payload, {
      sesion,
      item: { producto: productoSuelto, cantidad: 1, modificadores: [], notas: 'otra' },
    })
    const borrador = (await borradorDeSesion(payload, sesion.id))!
    if (!PEDIDOS.includes(borrador.id)) PEDIDOS.push(borrador.id)

    await payload.update({
      collection: 'pedidos',
      id: ronda.id,
      data: { estado: 'cancelado', motivoCancelacion: 'Prueba' } as never,
      overrideAccess: true,
    })

    // Con el borrador vivo, la sesión sigue abierta.
    const abierta = (await payload.findByID({
      collection: 'sesiones-mesa',
      id: sesion.id,
      depth: 0,
      overrideAccess: true,
    })) as { estado?: string }
    expect(abierta.estado).toBe('abierta')

    // El personal lo descarta: ya no queda nada y la sesión se cierra.
    await descartarBorrador(payload, borrador.id)
    await cerrarSesionSiCorresponde(payload, Number(sesion.id))

    const cerrada = (await payload.findByID({
      collection: 'sesiones-mesa',
      id: sesion.id,
      depth: 0,
      overrideAccess: true,
    })) as { estado?: string }
    expect(cerrada.estado).toBe('cerrada')
    expect(await borradorDeSesion(payload, sesion.id)).toBeNull()
  })

  it('cerrar una sesión deja limpio el borrador que nadie podía mandar', async () => {
    const sesion = await abrirMesaDePrueba()

    await agregarLinea(payload, {
      sesion,
      item: { producto: productoSuelto, cantidad: 1, modificadores: [] },
    })
    const borrador = (await borradorDeSesion(payload, sesion.id))!

    await descartarBorradoresDeSesion(payload, sesion.id)

    expect(await borradorDeSesion(payload, sesion.id)).toBeNull()
    expect(borrador.id).toBeTruthy()
  })

  it('al cancelar la última ronda, la sesión se cierra sola', async () => {
    const sesion = await abrirMesaDePrueba()

    await agregarLinea(payload, {
      sesion,
      item: { producto: productoSuelto, cantidad: 1, modificadores: [] },
    })
    const borrador = (await borradorDeSesion(payload, sesion.id))!
    if (!PEDIDOS.includes(borrador.id)) PEDIDOS.push(borrador.id)

    await enviarBorrador(payload, { borrador, sesionId: sesion.id, requiereAprobacion: true })
    await payload.update({
      collection: 'pedidos',
      id: borrador.id,
      data: { estado: 'cancelado', motivoCancelacion: 'Prueba' } as never,
      overrideAccess: true,
    })

    const cerrada = (await payload.findByID({
      collection: 'sesiones-mesa',
      id: sesion.id,
      depth: 0,
      overrideAccess: true,
    })) as { estado?: string; motivoCierre?: string }

    expect(cerrada.estado).toBe('cerrada')
    // No se cobró nada: la mesa sigue ocupada, no en limpieza.
    expect(cerrada.motivoCierre).toBe('manual')
  })
})

// ── Reparto del cobro ───────────────────────────────────────────────────────
describe('Reparto del cobro de una mesa', () => {
  it('reparte por ronda y por método sin perder un centavo', () => {
    const reparto = distribuirPagos(
      [
        { id: 1, total: 100 },
        { id: 2, total: 200 },
      ],
      [
        { metodo: 'efectivo', monto: 150 },
        { metodo: 'tarjeta', monto: 150 },
      ],
      60,
      30,
    )

    expect(reparto).toHaveLength(2)
    // Ronda de 100: un tercio de lo cobrado.
    expect(reparto[0].pagos).toEqual([
      { metodo: 'efectivo', monto: 50, referencia: null },
      { metodo: 'tarjeta', monto: 50, referencia: null },
    ])
    expect(reparto[1].pagos).toEqual([
      { metodo: 'efectivo', monto: 100, referencia: null },
      { metodo: 'tarjeta', monto: 100, referencia: null },
    ])

    const cobrado = reparto.flatMap((parte) => parte.pagos).reduce((s, p) => s + p.monto, 0)
    expect(cobrado).toBe(300)

    const propinas = reparto.reduce((s, parte) => s + parte.propina, 0)
    expect(propinas).toBeCloseTo(60, 6)

    const descuentos = reparto.reduce((s, parte) => s + parte.descuento, 0)
    expect(descuentos).toBeCloseTo(30, 6)
  })

  it('el residuo del redondeo cae en la última ronda', () => {
    const reparto = distribuirPagos(
      [
        { id: 1, total: 33.33 },
        { id: 2, total: 33.33 },
        { id: 3, total: 33.34 },
      ],
      [{ metodo: 'efectivo', monto: 100 }],
    )

    const totales = reparto.map((parte) => parte.pagos[0].monto)
    expect(totales.reduce((s, monto) => s + monto, 0)).toBeCloseTo(100, 6)
    expect(totales[2]).toBeCloseTo(33.34, 6)
  })
})
