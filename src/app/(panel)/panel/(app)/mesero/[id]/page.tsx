import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Where } from 'payload'

import { EncabezadoPagina } from '@/components/panel/encabezado-pagina'
import type { ProductoPos } from '@/components/panel/pos/dialogo-modificadores'
import {
  RevisionPedido,
  type LineaInicial,
} from '@/components/panel/mesero/revision-pedido'
import { Button } from '@/components/ui/button'
import { requireRol } from '@/lib/auth'
import { gruposDe } from '@/lib/carta'
import { hora, moneda } from '@/lib/formato'
import { claveDe, idNumero, idCrudo } from '@/lib/ids'
import { getPayloadClient, obtenerAjustes } from '@/lib/payload'

export const metadata: Metadata = { title: 'Revisar pedido' }

type Parametros = { id: string }

export default async function PaginaRevisarPedido({ params }: { params: Promise<Parametros> }) {
  await requireRol('admin', 'gerente', 'cajero', 'mesero')

  const { id } = await params
  const payload = await getPayloadClient()
  const ajustes = await obtenerAjustes()

  let pedido: {
    id: string | number
    folio?: string | null
    estado?: string | null
    ronda?: number | null
    comensales?: number | null
    clienteNombre?: string | null
    notas?: string | null
    propina?: number | null
    createdAt?: string | null
    mesa?: unknown
    items?: Array<{
      producto?: unknown
      nombre?: string | null
      cantidad?: number | null
      precioUnitario?: number | null
      notas?: string | null
      modificadores?: Array<{ nombre?: string | null; precioExtra?: number | null }> | null
    }> | null
  } | null = null

  try {
    pedido = (await payload.findByID({
      collection: 'pedidos',
      id: idNumero(id),
      depth: 1,
      overrideAccess: true,
    })) as typeof pedido
  } catch {
    pedido = null
  }

  // Si ya no espera confirmación, otro mesero lo atendió (o el enlace caducó).
  if (!pedido || pedido.estado !== 'por_confirmar') redirect('/panel/mesero')

  const { docs: productos } = await payload.find({
    collection: 'productos',
    where: { disponible: { equals: true } } as Where,
    depth: 1,
    limit: 400,
    pagination: false,
    sort: 'orden',
    overrideAccess: true,
  })

  const catalogo: ProductoPos[] = productos.map((producto) => ({
    id: producto.id,
    nombre: producto.nombre,
    descripcion: producto.descripcion ?? null,
    precio: producto.precio ?? 0,
    precioPromocional: producto.precioPromocional ?? null,
    disponible: producto.disponible ?? true,
    estacion: producto.estacion ?? null,
    categoria:
      producto.categoria && typeof producto.categoria === 'object'
        ? { id: producto.categoria.id, nombre: producto.categoria.nombre ?? '' }
        : producto.categoria,
    gruposModificadores: gruposDe(producto.gruposModificadores),
  }))

  const porId = new Map(catalogo.map((producto) => [String(producto.id), producto]))

  // Las líneas del pedido se rearman contra el catálogo vigente. Si un platillo
  // ya no está disponible, conservamos lo que se vendió para no perderlo.
  const iniciales: LineaInicial[] = (pedido.items ?? []).map((item) => {
    const producto =
      porId.get(claveDe(item.producto)) ??
      ({
        id: idCrudo(item.producto) ?? 0,
        nombre: item.nombre ?? 'Platillo',
        precio: item.precioUnitario ?? 0,
        disponible: false,
        gruposModificadores: [],
      } as ProductoPos)

    return {
      producto,
      cantidad: item.cantidad ?? 1,
      modificadores: (item.modificadores ?? []).map((mod) => ({
        nombre: mod.nombre ?? 'Opción',
        precioExtra: mod.precioExtra ?? 0,
      })),
      notas: item.notas ?? '',
    }
  })

  const mesa =
    pedido.mesa && typeof pedido.mesa === 'object'
      ? ((pedido.mesa as { nombre?: string }).nombre ?? null)
      : null
  const zona =
    pedido.mesa && typeof pedido.mesa === 'object'
      ? (pedido.mesa as { zona?: unknown }).zona
      : undefined
  const zonaNombre =
    zona && typeof zona === 'object' ? ((zona as { nombre?: string }).nombre ?? null) : null

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link href="/panel/mesero?vista=confirmar">
          <ArrowLeft className="size-4" />
          Volver a la cola
        </Link>
      </Button>

      <EncabezadoPagina
        titulo={`Revisar ${pedido.folio ?? 'pedido'}`}
        descripcion="Ajusta lo que haga falta y confirma para que pase a cocina. Nada de esto descuenta inventario hasta que apruebes."
      />

      <p className="mb-5 text-sm text-muted-foreground">
        Total enviado por el cliente: <strong>{moneda(
          (pedido.items ?? []).reduce(
            (suma, item) =>
              suma +
              ((item.precioUnitario ?? 0) +
                (item.modificadores ?? []).reduce(
                  (extra, mod) => extra + (mod.precioExtra ?? 0),
                  0,
                )) *
                (item.cantidad ?? 0),
            0,
          ),
          ajustes,
        )}</strong>
      </p>

      <RevisionPedido
        pedido={{
          id: String(pedido.id),
          folio: pedido.folio ?? '—',
          mesa,
          zona: zonaNombre,
          comensales: pedido.comensales ?? 1,
          clienteNombre: pedido.clienteNombre ?? null,
          ronda: pedido.ronda ?? null,
          horaTexto: hora(pedido.createdAt),
          propina: pedido.propina ?? 0,
          notas: pedido.notas ?? null,
        }}
        iniciales={JSON.parse(JSON.stringify(iniciales))}
        productos={JSON.parse(JSON.stringify(catalogo))}
        ajustes={ajustes}
      />
    </div>
  )
}
