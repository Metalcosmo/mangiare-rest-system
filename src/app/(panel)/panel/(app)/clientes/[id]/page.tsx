import { ArrowLeft, Cake, Mail, MapPin, Megaphone, Phone, Receipt, StickyNote } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Where } from 'payload'

import { etiquetaCliente } from '@/components/panel/crm/constantes'
import { DialogoAjustarPuntos } from '@/components/panel/crm/dialogo-ajustar-puntos'
import { DialogoCanjear } from '@/components/panel/crm/dialogo-canjear'
import { DialogoRegistro } from '@/components/panel/dialogo-registro'
import { EtiquetaEstado } from '@/components/panel/etiqueta-estado'
import { TarjetaKpi } from '@/components/panel/tarjeta-kpi'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { requireRol } from '@/lib/auth'
import { fecha, iniciales, moneda, numero } from '@/lib/formato'
import { getPayloadClient, obtenerAjustes } from '@/lib/payload'

export const metadata: Metadata = { title: 'Ficha del cliente' }

/** Agrega los platillos de todos los pedidos y devuelve el top de favoritos. */
function platillosFavoritos(
  pedidos: Array<{ items?: Array<{ nombre?: string | null; cantidad?: number | null }> | null }>,
  limite = 5,
): Array<{ nombre: string; cantidad: number }> {
  const conteo = new Map<string, number>()

  for (const pedido of pedidos) {
    for (const item of pedido.items ?? []) {
      const nombre = item.nombre?.trim()
      if (!nombre) continue
      conteo.set(nombre, (conteo.get(nombre) ?? 0) + Number(item.cantidad ?? 0))
    }
  }

  return [...conteo.entries()]
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, limite)
}

export default async function FichaClientePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRol('admin', 'gerente', 'cajero', 'mesero')

  const { id } = await params
  const payload = await getPayloadClient()
  const ajustes = await obtenerAjustes()

  let cliente
  try {
    cliente = await payload.findByID({
      collection: 'clientes',
      id,
      depth: 0,
      overrideAccess: true,
    })
  } catch {
    notFound()
  }

  if (!cliente) notFound()

  const [pedidos, recompensas] = await Promise.all([
    payload.find({
      collection: 'pedidos',
      where: { cliente: { equals: id } } as Where,
      depth: 0,
      limit: 100,
      pagination: false,
      sort: '-createdAt',
      overrideAccess: true,
    }),
    payload.find({
      collection: 'recompensas',
      where: { activa: { equals: true } } as Where,
      depth: 0,
      limit: 100,
      pagination: false,
      sort: 'costoPuntos',
      overrideAccess: true,
    }),
  ])

  const puntos = Number(cliente.puntos ?? 0)
  const valorPunto = Number(ajustes.valorPunto ?? 0.1)
  const favoritos = platillosFavoritos(pedidos.docs)
  const etiquetas = Array.isArray(cliente.etiquetas) ? cliente.etiquetas : []

  const recompensasDisponibles = recompensas.docs.map((recompensa) => ({
    id: String(recompensa.id),
    nombre: recompensa.nombre,
    costoPuntos: Number(recompensa.costoPuntos ?? 0),
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
          <Link href="/panel/clientes">
            <ArrowLeft className="size-4" />
            Volver a clientes
          </Link>
        </Button>
      </div>

      <Card className="rounded-xl border bg-card">
        <CardContent className="flex flex-col gap-6 p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="size-16">
              <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                {iniciales(cliente.nombre)}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  {cliente.nombre}
                </h1>
                <EtiquetaEstado valor={cliente.nivel ?? 'bronce'} />
                {etiquetas.map((etiqueta) => (
                  <Badge key={etiqueta} variant="secondary" className="border-0">
                    {etiquetaCliente(etiqueta)}
                  </Badge>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {cliente.telefono && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="size-3.5" />
                    {cliente.telefono}
                  </span>
                )}
                {cliente.email && (
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="size-3.5" />
                    {cliente.email}
                  </span>
                )}
                {cliente.fechaNacimiento && (
                  <span className="inline-flex items-center gap-1.5">
                    <Cake className="size-3.5" />
                    {fecha(cliente.fechaNacimiento, { year: undefined })}
                  </span>
                )}
                {cliente.direccion && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {cliente.direccion}
                  </span>
                )}
                {cliente.aceptaMarketing && (
                  <span className="inline-flex items-center gap-1.5">
                    <Megaphone className="size-3.5" />
                    Acepta promociones
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DialogoCanjear
              clienteId={String(cliente.id)}
              clienteNombre={cliente.nombre}
              puntos={puntos}
              recompensas={recompensasDisponibles}
            />
            <DialogoAjustarPuntos
              clienteId={String(cliente.id)}
              clienteNombre={cliente.nombre}
              puntos={puntos}
            />
            <DialogoRegistro
              recurso="clientes"
              id={String(cliente.id)}
              valores={cliente as unknown as Record<string, unknown>}
              opciones={{}}
              variante="editar"
              className="border"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <TarjetaKpi etiqueta="Puntos" valor={numero(puntos)} detalle="saldo actual" />
        <TarjetaKpi etiqueta="Visitas" valor={numero(cliente.visitas ?? 0)} detalle="acumuladas" />
        <TarjetaKpi
          etiqueta="Gasto total"
          valor={moneda(cliente.totalGastado ?? 0, ajustes)}
          detalle="histórico"
        />
        <TarjetaKpi
          etiqueta="Ticket promedio"
          valor={moneda(cliente.ticketPromedio ?? 0, ajustes)}
          detalle="por visita"
        />
        <TarjetaKpi etiqueta="Última visita" valor={fecha(cliente.ultimaVisita)} />
        <TarjetaKpi
          etiqueta="Valor de sus puntos"
          valor={moneda(puntos * valorPunto, ajustes)}
          detalle={`${numero(puntos)} × ${moneda(valorPunto, ajustes)}`}
          acento="aviso"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="rounded-xl border bg-card xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="size-4 text-primary" />
              Historial de pedidos
              <span className="text-sm font-normal text-muted-foreground">
                ({numero(pedidos.docs.length)})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {pedidos.docs.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">
                Este cliente todavía no tiene pedidos registrados.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Folio</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedidos.docs.map((pedido) => (
                    <TableRow key={String(pedido.id)}>
                      <TableCell className="font-medium">
                        {pedido.folio ?? `#${pedido.id}`}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {fecha(pedido.createdAt)}
                      </TableCell>
                      <TableCell>
                        <EtiquetaEstado valor={pedido.canal} />
                      </TableCell>
                      <TableCell>
                        <EtiquetaEstado valor={pedido.estado} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {moneda(pedido.total ?? 0, ajustes)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="rounded-xl border bg-card">
            <CardHeader>
              <CardTitle className="text-base">Platillos favoritos</CardTitle>
            </CardHeader>
            <CardContent>
              {favoritos.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aún no hay platillos suficientes para detectar preferencias.
                </p>
              ) : (
                <ol className="flex flex-col gap-3">
                  {favoritos.map((platillo, indice) => (
                    <li key={platillo.nombre} className="flex items-center gap-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {indice + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm">{platillo.nombre}</span>
                      <span className="text-sm font-medium tabular-nums text-muted-foreground">
                        ×{numero(platillo.cantidad)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <StickyNote className="size-4 text-primary" />
                Notas y preferencias
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              {cliente.notas ? (
                <p className="whitespace-pre-line text-muted-foreground">{cliente.notas}</p>
              ) : (
                <p className="text-muted-foreground">Sin notas registradas.</p>
              )}
              <Separator />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Cliente desde</span>
                <span>{fecha(cliente.createdAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
