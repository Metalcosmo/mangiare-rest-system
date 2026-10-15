import { QrCode } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { Where } from 'payload'

import {
  MenuCliente,
  type LineaPedido,
  type ProductoCliente,
  type RondaPedido,
} from '@/components/carta/menu-cliente'
import { PuertaMesa, type ModoPuerta } from '@/components/carta/puerta-mesa'
import { Button } from '@/components/ui/button'
import { gruposDe } from '@/lib/carta'
import { leerMesa } from '@/lib/mesa-cookie'
import { sesionAbiertaDeMesa } from '@/lib/mesa-sesion'
import { ETIQUETA_ESTADO, type EstadoPedido } from '@/lib/pedidos'
import { getPayloadClient, obtenerAjustes } from '@/lib/payload'

type Parametros = { slug: string }

type ItemCrudo = {
  producto?: unknown
  nombre?: string | null
  cantidad?: number | null
  precioUnitario?: number | null
  modificadores?: Array<{ nombre?: string | null }> | null
  notas?: string | null
  subtotal?: number | null
}

type PedidoCrudo = {
  id: string | number
  folio?: string | null
  estado?: string | null
  total?: number | null
  items?: ItemCrudo[] | null
}

async function cargarMesa(slug: string) {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'mesas',
    where: { slug: { equals: slug }, activa: { equals: true } } as Where,
    depth: 1,
    limit: 1,
    overrideAccess: true,
  })
  return docs[0] ?? null
}

/** Convierte las líneas del pedido en lo que pinta la carta. */
const aLineas = (items: ItemCrudo[] | null | undefined): LineaPedido[] =>
  (items ?? []).map((item, indice) => ({
    indice,
    nombre: item.nombre ?? 'Platillo',
    cantidad: item.cantidad ?? 1,
    precioUnitario: item.precioUnitario ?? 0,
    modificadores: (item.modificadores ?? [])
      .map((mod) => mod.nombre ?? '')
      .filter(Boolean),
    notas: item.notas ?? null,
    subtotal: item.subtotal ?? 0,
  }))

export async function generateMetadata({
  params,
}: {
  params: Promise<Parametros>
}): Promise<Metadata> {
  const { slug } = await params
  const [mesa, ajustes] = await Promise.all([cargarMesa(slug), obtenerAjustes()])

  return {
    title: mesa
      ? `${ajustes.nombreComercial} · Carta de ${mesa.nombre}`
      : `${ajustes.nombreComercial} · Mesa no encontrada`,
    description: ajustes.mensajeBienvenida ?? undefined,
  }
}

export default async function MesaPage({ params }: { params: Promise<Parametros> }) {
  const { slug } = await params
  const payload = await getPayloadClient()

  const [mesa, ajustes] = await Promise.all([cargarMesa(slug), obtenerAjustes()])

  if (!mesa) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <QrCode className="size-8" />
        </span>
        <div>
          <h1 className="text-xl font-semibold">No encontramos esta mesa</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            El código QR puede estar desactualizado. Pide ayuda al personal del restaurante para
            abrir la carta correcta.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">Ver todas las mesas</Link>
        </Button>
      </div>
    )
  }

  // Mesa fuera de servicio: ni identidad ni carta.
  if (mesa.estado === 'fuera_servicio') {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <QrCode className="size-8" />
        </span>
        <div>
          <h1 className="text-xl font-semibold">Esta mesa no está en servicio</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pide ayuda al personal del restaurante para que te reubiquen.
          </p>
        </div>
      </div>
    )
  }

  // ¿Quién está pidiendo? La cookie manda; si no hay, decidimos la puerta.
  const propia = await leerMesa(mesa.id)

  if (!propia) {
    const abierta = await sesionAbiertaDeMesa(payload, mesa.id)

    const modo: ModoPuerta = !abierta ? 'abrir' : abierta.anfitrionCedula ? 'unir' : 'reclamar'

    return <PuertaMesa modo={modo} mesa={{ nombre: mesa.nombre, slug }} ajustes={ajustes} />
  }

  const sesion = propia.sesion

  const [categorias, productos, pedidosRes] = await Promise.all([
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
      collection: 'productos',
      where: { disponible: { equals: true } } as Where,
      depth: 1,
      limit: 500,
      pagination: false,
      sort: 'orden',
      overrideAccess: true,
    }),
    payload.find({
      collection: 'pedidos',
      where: { sesion: { equals: Number(sesion.id) } } as Where,
      depth: 0,
      limit: 50,
      pagination: false,
      sort: 'id',
      overrideAccess: true,
    }),
  ])

  const pedidos = pedidosRes.docs as unknown as PedidoCrudo[]
  const borradorCrudo = pedidos.find((pedido) => pedido.estado === 'borrador') ?? null

  const rondas: RondaPedido[] = pedidos
    .filter((pedido) => pedido.estado !== 'borrador')
    .map((pedido) => ({
      id: String(pedido.id),
      folio: pedido.folio ?? '—',
      estado: pedido.estado ?? 'nuevo',
      estadoTexto: ETIQUETA_ESTADO[(pedido.estado ?? 'nuevo') as EstadoPedido] ?? '',
      total: pedido.total ?? 0,
      items: aLineas(pedido.items),
    }))

  const catalogo: ProductoCliente[] = productos.docs.map((producto) => ({
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
    etiquetasCarta: producto.etiquetas ?? [],
    alergenos: producto.alergenos ?? [],
  }))

  return (
    <MenuCliente
      ajustes={ajustes}
      mesa={{
        id: mesa.id,
        nombre: mesa.nombre,
        slug: mesa.slug ?? slug,
        capacidad: mesa.capacidad ?? 1,
        zona:
          mesa.zona && typeof mesa.zona === 'object' ? { nombre: mesa.zona.nombre ?? '' } : null,
      }}
      sesion={{ anfitrionNombre: sesion.anfitrionNombre ?? null, rol: propia.rol }}
      rondas={rondas}
      borrador={{
        total: borradorCrudo?.total ?? 0,
        items: aLineas(borradorCrudo?.items),
      }}
      categorias={categorias.docs.map((categoria) => ({
        id: categoria.id,
        nombre: categoria.nombre,
        icono: categoria.icono ?? null,
        descripcion: categoria.descripcion ?? null,
      }))}
      productos={JSON.parse(JSON.stringify(catalogo))}
    />
  )
}
