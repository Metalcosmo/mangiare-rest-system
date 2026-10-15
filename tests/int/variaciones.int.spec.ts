// @vitest-environment node
/**
 * Variaciones de un platillo: tallas y extras.
 *
 * Lo crítico aquí es que **el precio de una opción salga siempre del catálogo**.
 * El cliente manda `{ nombre, precioExtra }`, y ese `precioExtra` no se puede
 * creer: si se creyera, cualquiera podría pedir «Grande» o «Doble queso» a
 * precio cero. El hook re-resuelve cada modificador contra los grupos del
 * platillo antes de guardarlo.
 *
 * El entorno debe ser `node`: el bundle de `wrangler` que usa el adaptador de
 * D1 no funciona bajo jsdom.
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import {
  gruposDisponibles,
  opcionesElegibles,
  resolverModificadores,
  seleccionInicial,
  validarVariaciones,
  type GrupoOpciones,
} from '@/lib/carta'

let payload: Payload

/** Pedidos creados por las pruebas (nacen `por_confirmar`: no tocan stock). */
const CREADOS: Array<string | number> = []

// ── Utilidades puras ────────────────────────────────────────────────────────

const GRUPO_UNICO: GrupoOpciones = {
  id: 1,
  nombre: 'Talla',
  tipo: 'unica',
  obligatorio: true,
  minSelecciones: 1,
  maxSelecciones: 1,
  opciones: [
    { nombre: 'Chica', precioExtra: 0, porDefecto: true, disponible: true },
    { nombre: 'Mediana', precioExtra: 40, disponible: true },
    { nombre: 'Grande', precioExtra: 80, disponible: true },
  ],
}

const GRUPO_MULTIPLE: GrupoOpciones = {
  id: 2,
  nombre: 'Extras',
  tipo: 'multiple',
  obligatorio: false,
  minSelecciones: 0,
  maxSelecciones: 2,
  opciones: [
    { nombre: 'Doble queso', precioExtra: 25, disponible: true },
    { nombre: 'Tocino', precioExtra: 30, disponible: true },
    { nombre: 'Champiñones', precioExtra: 22, disponible: true },
    { nombre: 'Piña', precioExtra: 18, disponible: false },
  ],
}

const PRODUCTO = {
  id: 99,
  nombre: 'Pizza de prueba',
  gruposModificadores: [GRUPO_UNICO, GRUPO_MULTIPLE],
}

describe('Resolución de variaciones', () => {
  it('toma el precio del catálogo aunque el cliente mande cero', () => {
    const resueltos = resolverModificadores(PRODUCTO, [
      { nombre: 'Grande', precioExtra: 0 },
    ])

    expect(resueltos).toEqual([{ nombre: 'Grande', precioExtra: 80 }])
  })

  it('descarta opciones que no pertenecen al platillo', () => {
    const resueltos = resolverModificadores(PRODUCTO, [
      { nombre: 'Caviar', precioExtra: 0 },
      { nombre: 'Grande', precioExtra: 0 },
    ])

    expect(resueltos).toEqual([{ nombre: 'Grande', precioExtra: 80 }])
  })

  it('descarta las opciones marcadas como no disponibles', () => {
    const resueltos = resolverModificadores(PRODUCTO, [
      { nombre: 'Piña', precioExtra: 18 },
      { nombre: 'Tocino', precioExtra: 0 },
    ])

    expect(resueltos).toEqual([{ nombre: 'Tocino', precioExtra: 30 }])
  })

  it('respeta el máximo del grupo y no repite opciones', () => {
    const resueltos = resolverModificadores(PRODUCTO, [
      { nombre: 'Doble queso' },
      { nombre: 'Tocino' },
      { nombre: 'Champiñones' },
      { nombre: 'Doble queso' },
    ])

    // El grupo admite dos, y la repetida no cuenta dos veces.
    expect(resueltos.map((m) => m.nombre)).toEqual(['Doble queso', 'Tocino'])
  })

  it('en un grupo único se queda con la primera opción enviada', () => {
    const resueltos = resolverModificadores(PRODUCTO, [
      { nombre: 'Grande' },
      { nombre: 'Mediana' },
    ])

    expect(resueltos).toEqual([{ nombre: 'Grande', precioExtra: 80 }])
  })

  it('sin grupos devuelve una lista vacía', () => {
    expect(resolverModificadores({ gruposModificadores: [] }, [{ nombre: 'Grande' }])).toEqual([])
    expect(resolverModificadores(null, [{ nombre: 'Grande' }])).toEqual([])
  })
})

describe('Preselección de opciones', () => {
  it('un grupo único nunca arranca con dos opciones marcadas', () => {
    const grupo: GrupoOpciones = {
      id: 7,
      nombre: 'Talla',
      tipo: 'unica',
      maxSelecciones: 3,
      opciones: [
        { nombre: 'Chica', precioExtra: 0, porDefecto: true },
        { nombre: 'Mediana', precioExtra: 40, porDefecto: true },
      ],
    }

    expect(seleccionInicial([grupo])).toEqual({ '7': ['Chica'] })
  })

  it('un grupo múltiple sí puede arrancar con varias', () => {
    const grupo: GrupoOpciones = {
      id: 8,
      nombre: 'Extras',
      tipo: 'multiple',
      maxSelecciones: 3,
      opciones: [
        { nombre: 'Queso', precioExtra: 25, porDefecto: true },
        { nombre: 'Tocino', precioExtra: 30, porDefecto: true },
      ],
    }

    expect(seleccionInicial([grupo])).toEqual({ '8': ['Queso', 'Tocino'] })
  })
})

describe('Disponibilidad de opciones', () => {
  it('oculta las opciones agotadas', () => {
    const [extras] = gruposDisponibles(PRODUCTO).filter((grupo) => grupo.nombre === 'Extras')
    expect(extras?.opciones?.map((opcion) => opcion.nombre)).toEqual([
      'Doble queso',
      'Tocino',
      'Champiñones',
    ])
  })

  it('esconde el grupo entero si se queda sin opciones', () => {
    const producto = {
      gruposModificadores: [
        {
          id: 1,
          nombre: 'Extras',
          tipo: 'multiple',
          opciones: [{ nombre: 'Piña', precioExtra: 18, disponible: false }],
        },
      ],
    }

    expect(gruposDisponibles(producto)).toEqual([])
    expect(opcionesElegibles(producto)).toBe(0)
  })
})

describe('Validación de variaciones antes de crear el pedido', () => {
  const item = (modificadores: Array<{ nombre: string }>) => [{ producto: 99, modificadores }]

  it('exige los grupos obligatorios', () => {
    expect(validarVariaciones(item([]), [PRODUCTO])).toContain('Talla')
  })

  it('acepta un pedido correcto', () => {
    expect(validarVariaciones(item([{ nombre: 'Grande' }]), [PRODUCTO])).toBeNull()
  })

  it('rechaza opciones que no son del platillo', () => {
    expect(validarVariaciones(item([{ nombre: 'Caviar' }]), [PRODUCTO])).toContain('Caviar')
  })

  it('rechaza opciones agotadas', () => {
    const mensaje = validarVariaciones(
      item([{ nombre: 'Chica' }, { nombre: 'Piña' }]),
      [PRODUCTO],
    )
    expect(mensaje).toContain('Piña')
  })

  it('rechaza pasarse del máximo del grupo', () => {
    const mensaje = validarVariaciones(
      item([{ nombre: 'Chica' }, { nombre: 'Doble queso' }, { nombre: 'Tocino' }, { nombre: 'Champiñones' }]),
      [PRODUCTO],
    )
    expect(mensaje).toContain('máximo')
  })
})

// ── Contra la base real ─────────────────────────────────────────────────────

describe('El precio de las variaciones sale del catálogo', () => {
  let pizza: { id: string | number; precio?: number | null; precioPromocional?: number | null } | null =
    null

  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })

    const { docs } = await payload.find({
      collection: 'productos',
      where: { nombre: { equals: 'Pizza margarita' } },
      depth: 1,
      limit: 1,
      overrideAccess: true,
    })

    if (docs[0]) {
      pizza = docs[0] as unknown as typeof pizza
    }
  })

  afterAll(async () => {
    for (const id of CREADOS) {
      try {
        await payload.delete({ collection: 'pedidos', id, overrideAccess: true })
      } catch {
        // Si ya no existe, no hay nada que limpiar.
      }
    }
  })

  /** Crea un pedido pendiente: no descuenta inventario y se puede borrar. */
  const crear = async (modificadores: Array<{ nombre: string; precioExtra: number }>) => {
    const pedido = await payload.create({
      collection: 'pedidos',
      overrideAccess: true,
      data: {
        canal: 'mostrador',
        estado: 'por_confirmar',
        comensales: 1,
        items: [{ producto: pizza!.id, cantidad: 1, modificadores }],
      } as never,
    })

    CREADOS.push(pedido.id)
    return pedido as unknown as {
      total?: number
      items?: Array<{ modificadores?: Array<{ nombre: string; precioExtra: number }> }>
    }
  }

  it('un extra a precio cero se guarda con el precio real', async () => {
    if (!pizza) return

    const precioBase = pizza.precioPromocional ?? pizza.precio ?? 0
    const pedido = await crear([{ nombre: 'Tamaño inexistente', precioExtra: 0 }])

    // «Tamaño inexistente» no existe: se descarta y sólo queda el precio base.
    expect(pedido.items?.[0]?.modificadores ?? []).toEqual([])
    expect(pedido.total).toBeCloseTo(precioBase, 2)
  })

  it('la talla elegida cobra su precio de catálogo', async () => {
    if (!pizza) return

    const precioBase = pizza.precioPromocional ?? pizza.precio ?? 0

    const { docs } = await payload.find({
      collection: 'grupos-modificadores',
      where: { nombre: { equals: 'Talla' } },
      depth: 0,
      limit: 1,
      overrideAccess: true,
    })

    const grupo = docs[0] as unknown as {
      opciones?: Array<{ nombre: string; precioExtra?: number | null }>
    }
    const grande = grupo?.opciones?.find((opcion) => opcion.nombre === 'Grande')
    if (!grande) return

    const esperado = Number(grande.precioExtra ?? 0)
    // El cliente intenta no pagar la talla.
    const pedido = await crear([{ nombre: 'Grande', precioExtra: 0 }])

    // Payload añade un `id` a cada fila del arreglo: comparamos sólo lo que importa.
    const guardados = pedido.items?.[0]?.modificadores ?? []
    expect(guardados).toHaveLength(1)
    expect(guardados[0]).toMatchObject({ nombre: 'Grande', precioExtra: esperado })
    expect(pedido.total).toBeCloseTo(precioBase + esperado, 2)
  })
})
