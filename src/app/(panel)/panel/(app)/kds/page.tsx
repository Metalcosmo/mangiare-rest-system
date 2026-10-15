import type { Metadata } from 'next'
import type { Where } from 'payload'

import { PantallaCocina } from '@/components/panel/kds/pantalla-cocina'
import { requireRol } from '@/lib/auth'
import { getPayloadClient, obtenerAjustes } from '@/lib/payload'

export const metadata: Metadata = { title: 'Pantalla de cocina' }

export default async function KdsPage() {
  await requireRol('admin', 'gerente', 'cajero', 'cocina', 'mesero')

  const payload = await getPayloadClient()

  const [ajustes, pedidos] = await Promise.all([
    obtenerAjustes(),
    payload.find({
      collection: 'pedidos',
      where: { estado: { in: ['nuevo', 'en_preparacion', 'listo'] } } as Where,
      depth: 1,
      limit: 100,
      pagination: false,
      sort: 'createdAt',
      overrideAccess: true,
    }),
  ])

  const comandas = pedidos.docs.map((pedido) => ({
    id: String(pedido.id),
    folio: pedido.folio ?? '',
    canal: pedido.canal ?? 'mesa',
    estado: pedido.estado ?? 'nuevo',
    comensales: pedido.comensales ?? 1,
    notas: pedido.notas ?? null,
    createdAt: pedido.createdAt,
    horaEnvioCocina: pedido.horaEnvioCocina ?? null,
    mesa:
      pedido.mesa && typeof pedido.mesa === 'object'
        ? { nombre: pedido.mesa.nombre ?? '' }
        : null,
    mesero:
      pedido.mesero && typeof pedido.mesero === 'object'
        ? { nombre: pedido.mesero.nombre ?? '' }
        : null,
    items: (pedido.items ?? []).map((item, indice) => ({
      indice,
      nombre: item.nombre ?? '',
      cantidad: item.cantidad ?? 1,
      estacion: item.estacion ?? 'cocina',
      estadoItem: item.estadoItem ?? 'pendiente',
      notas: item.notas ?? null,
      modificadores: (item.modificadores ?? []).map((mod) => mod.nombre ?? '').filter(Boolean),
    })),
  }))

  return (
    <PantallaCocina
      ajustes={ajustes}
      comandas={JSON.parse(JSON.stringify(comandas))}
    />
  )
}
