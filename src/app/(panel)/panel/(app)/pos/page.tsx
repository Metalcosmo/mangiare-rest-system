import type { Metadata } from 'next'
import type { Where } from 'payload'

import { PuntoDeVenta, type CuentaAbierta } from '@/components/panel/pos/punto-de-venta'
import { requireRol } from '@/lib/auth'
import { claveDe } from '@/lib/ids'
import { getPayloadClient, obtenerAjustes } from '@/lib/payload'
import { ESTADOS_ACTIVOS } from '@/lib/pedidos'

export const metadata: Metadata = { title: 'Punto de venta' }

type MesaRef = { id: string | number; nombre?: string | null }
type SesionRef = { id: string | number; mesa?: unknown; anfitrionNombre?: string | null }

type PedidoCrudo = {
  id: string | number
  folio?: string | null
  estado?: string | null
  total?: number | null
  mesa?: unknown
  sesion?: unknown
  items?: Array<{ nombre?: string | null; cantidad?: number | null }> | null
}

export default async function PosPage({
  searchParams,
}: {
  searchParams: Promise<{ mesa?: string }>
}) {
  await requireRol('admin', 'gerente', 'cajero', 'mesero')

  const { mesa: mesaPedida } = await searchParams

  const payload = await getPayloadClient()

  const [ajustes, productos, categorias, mesas, pedidosAbiertos, sesiones, borradores] =
    await Promise.all([
      obtenerAjustes(),
      payload.find({
        collection: 'productos',
        where: { disponible: { equals: true } } as Where,
        depth: 1,
        limit: 400,
        pagination: false,
        sort: 'orden',
        overrideAccess: true,
      }),
      payload.find({
        collection: 'categorias',
        where: { activa: { equals: true } } as Where,
        depth: 0,
        limit: 100,
        pagination: false,
        sort: 'orden',
        overrideAccess: true,
      }),
      payload.find({
        collection: 'mesas',
        where: { activa: { equals: true } } as Where,
        depth: 1,
        limit: 200,
        pagination: false,
        sort: 'nombre',
        overrideAccess: true,
      }),
      payload.find({
        collection: 'pedidos',
        where: { estado: { in: ESTADOS_ACTIVOS } } as Where,
        depth: 1,
        limit: 300,
        pagination: false,
        sort: '-createdAt',
        overrideAccess: true,
      }),
      payload.find({
        collection: 'sesiones-mesa',
        where: { estado: { equals: 'abierta' } } as Where,
        depth: 0,
        limit: 200,
        pagination: false,
        overrideAccess: true,
      }),
      payload.find({
        collection: 'pedidos',
        where: { estado: { equals: 'borrador' } } as Where,
        depth: 0,
        limit: 200,
        pagination: false,
        overrideAccess: true,
      }),
    ])

  const sesionesPorMesa = new Map<string, SesionRef>()
  for (const sesion of sesiones.docs as unknown as SesionRef[]) {
    sesionesPorMesa.set(claveDe(sesion.mesa), sesion)
  }

  // Cuántos platillos tiene la mesa sin enviar, para avisar antes de cobrar.
  const sinEnviarPorMesa = new Map<string, number>()
  for (const borrador of borradores.docs as unknown as PedidoCrudo[]) {
    const clave = claveDe(borrador.mesa)
    if (!clave) continue
    const cantidad = (borrador.items ?? []).reduce(
      (suma, item) => suma + (item.cantidad ?? 0),
      0,
    )
    sinEnviarPorMesa.set(clave, (sinEnviarPorMesa.get(clave) ?? 0) + cantidad)
  }

  // Una cuenta por mesa: las rondas se suman. Los pedidos sin mesa (mostrador,
  // para llevar, históricos) se listan por separado.
  const porMesa = new Map<string, CuentaAbierta>()
  const sueltos: CuentaAbierta[] = []

  for (const pedido of pedidosAbiertos.docs as unknown as PedidoCrudo[]) {
    const mesaClave = claveDe(pedido.mesa)

    if (!mesaClave) {
      sueltos.push({
        id: String(pedido.id),
        tipo: 'pedido',
        folio: pedido.folio ?? '',
        estado: pedido.estado ?? 'nuevo',
        total: pedido.total ?? 0,
        mesa: null,
        anfitrion: null,
        rondas: 1,
        sinEnviar: 0,
        items: (pedido.items ?? []).map((item) => ({
          nombre: item.nombre ?? '',
          cantidad: item.cantidad ?? 1,
        })),
      })
      continue
    }

    const existente = porMesa.get(mesaClave)
    const items = (pedido.items ?? []).map((item) => ({
      nombre: item.nombre ?? '',
      cantidad: item.cantidad ?? 1,
    }))

    if (existente) {
      existente.total = (existente.total ?? 0) + (pedido.total ?? 0)
      existente.rondas = (existente.rondas ?? 1) + 1
      existente.items = [...(existente.items ?? []), ...items]
      continue
    }

    const mesa =
      pedido.mesa && typeof pedido.mesa === 'object' ? (pedido.mesa as MesaRef) : null
    const sesion = sesionesPorMesa.get(mesaClave)

    porMesa.set(mesaClave, {
      id: String(sesion?.id ?? pedido.id),
      tipo: 'mesa',
      folio: pedido.folio ?? '',
      estado: pedido.estado ?? 'nuevo',
      total: pedido.total ?? 0,
      mesa: mesa ? { id: String(mesa.id), nombre: mesa.nombre ?? '' } : null,
      anfitrion: sesion?.anfitrionNombre ?? null,
      rondas: 1,
      sinEnviar: sinEnviarPorMesa.get(mesaClave) ?? 0,
      items,
    })
  }

  const cuentasAbiertas: CuentaAbierta[] = [...porMesa.values(), ...sueltos]

  return (
    <PuntoDeVenta
      ajustes={ajustes}
      productos={JSON.parse(JSON.stringify(productos.docs))}
      categorias={JSON.parse(JSON.stringify(categorias.docs))}
      mesas={JSON.parse(JSON.stringify(mesas.docs))}
      cuentasAbiertas={cuentasAbiertas}
      mesaInicial={mesaPedida}
    />
  )
}
