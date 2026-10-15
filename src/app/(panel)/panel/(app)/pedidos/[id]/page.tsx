import { ArrowLeft, Clock, MapPin, Phone, User } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { EncabezadoPagina } from '@/components/panel/encabezado-pagina'
import { EtiquetaEstado } from '@/components/panel/etiqueta-estado'
import { AccionesPedido } from '@/components/panel/pedidos/acciones-pedido'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { requireUsuario } from '@/lib/auth'
import { fechaHora, moneda } from '@/lib/formato'
import { etiquetaDe, getPayloadClient, obtenerAjustes } from '@/lib/payload'

export const metadata: Metadata = { title: 'Detalle del pedido' }

const ETIQUETA_METODO: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  puntos: 'Puntos de lealtad',
  cortesia: 'Cortesía',
}

export default async function PedidoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireUsuario()
  const { id } = await params

  const payload = await getPayloadClient()
  const ajustes = await obtenerAjustes()

  let pedido
  try {
    pedido = await payload.findByID({
      collection: 'pedidos',
      id,
      depth: 2,
      overrideAccess: true,
    })
  } catch {
    notFound()
  }

  if (!pedido) notFound()

  const items = pedido.items ?? []
  const pagos = pedido.pagos ?? []
  const pagado = pagos.reduce((suma, pago) => suma + (pago.monto ?? 0), 0)

  const linea = (etiqueta: string, valor: unknown) => (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{etiqueta}</span>
      <span className="text-right font-medium">{etiquetaDe(valor)}</span>
    </div>
  )

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link href="/panel/pedidos">
          <ArrowLeft className="size-4" />
          Volver a pedidos
        </Link>
      </Button>

      <EncabezadoPagina
        titulo={`Pedido ${pedido.folio}`}
        descripcion={`Abierto el ${fechaHora(pedido.createdAt)}`}
        icono={Clock}
      >
        <AccionesPedido
          pedidoId={String(pedido.id)}
          folio={pedido.folio ?? ''}
          estado={pedido.estado ?? 'nuevo'}
          total={pedido.total ?? 0}
          ajustes={ajustes}
        />
      </EncabezadoPagina>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <EtiquetaEstado valor={pedido.estado ?? 'nuevo'} />
        <EtiquetaEstado valor={pedido.canal ?? 'mesa'} />
        {pedido.turno && <Badge variant="secondary">{pedido.turno}</Badge>}
        <Badge variant="secondary">
          {items.length} líneas ·{' '}
          {items.reduce((suma, item) => suma + (item.cantidad ?? 0), 0)} artículos
        </Badge>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Platillos</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Platillo</TableHead>
                    <TableHead>Estación</TableHead>
                    <TableHead className="text-center">Cant.</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="pr-6 text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, indice) => (
                    <TableRow key={indice}>
                      <TableCell className="pl-6">
                        <div className="flex flex-col">
                          <span className="font-medium">{item.nombre}</span>
                          {(item.modificadores ?? []).length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {(item.modificadores ?? [])
                                .map((mod) => mod.nombre)
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                          )}
                          {item.notas && (
                            <span className="text-xs italic text-muted-foreground">
                              {item.notas}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <EtiquetaEstado valor={item.estacion ?? 'cocina'} />
                      </TableCell>
                      <TableCell className="text-center">{item.cantidad}</TableCell>
                      <TableCell className="text-right">
                        {moneda(item.precioUnitario ?? 0, ajustes)}
                      </TableCell>
                      <TableCell className="pr-6 text-right font-medium">
                        {moneda(item.subtotal ?? 0, ajustes)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} className="pl-6 text-right text-muted-foreground">
                      Subtotal
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      {moneda(pedido.subtotal ?? 0, ajustes)}
                    </TableCell>
                  </TableRow>
                  {(pedido.descuento ?? 0) > 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="pl-6 text-right text-muted-foreground">
                        Descuento
                      </TableCell>
                      <TableCell className="pr-6 text-right text-destructive">
                        -{moneda(pedido.descuento ?? 0, ajustes)}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell colSpan={4} className="pl-6 text-right text-muted-foreground">
                      Impuesto {ajustes.impuestoIncluido !== false ? '(incluido)' : ''}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      {moneda(pedido.impuesto ?? 0, ajustes)}
                    </TableCell>
                  </TableRow>
                  {(pedido.propina ?? 0) > 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="pl-6 text-right text-muted-foreground">
                        Propina
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        {moneda(pedido.propina ?? 0, ajustes)}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell colSpan={4} className="pl-6 text-right font-semibold">
                      Total
                    </TableCell>
                    <TableCell className="pr-6 text-right text-base font-semibold">
                      {moneda(pedido.total ?? 0, ajustes)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pagos</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {pagos.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Este pedido todavía no tiene pagos registrados.
                </p>
              )}
              {pagos.map((pago, indice) => (
                <div
                  key={indice}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {ETIQUETA_METODO[pago.metodo ?? 'efectivo'] ?? pago.metodo}
                    </span>
                    {pago.referencia && (
                      <span className="text-xs text-muted-foreground">{pago.referencia}</span>
                    )}
                  </div>
                  <span className="font-medium">{moneda(pago.monto ?? 0, ajustes)}</span>
                </div>
              ))}
              {pagos.length > 0 && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total cobrado</span>
                    <span className="font-semibold">{moneda(pagado, ajustes)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Información</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="size-4 text-muted-foreground" />
                {etiquetaDe(pedido.mesa)}
                {pedido.canal === 'mesa' && pedido.comensales
                  ? ` · ${pedido.comensales} comensales`
                  : ''}
              </div>
              {pedido.clienteNombre && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="size-4 text-muted-foreground" />
                  {pedido.cliente && typeof pedido.cliente === 'object' ? (
                    <Link
                      href={`/panel/clientes/${pedido.cliente.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {pedido.clienteNombre}
                    </Link>
                  ) : (
                    pedido.clienteNombre
                  )}
                </div>
              )}
              {pedido.clienteTelefono && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="size-4 text-muted-foreground" />
                  {pedido.clienteTelefono}
                </div>
              )}

              <Separator />
              {linea('Atendido por', pedido.mesero)}
              {linea('Turno', pedido.turno)}
              {pedido.cupon && typeof pedido.cupon === 'object' && linea('Cupón', pedido.cupon)}
              {(pedido.costoEstimado ?? 0) > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Costo de ingredientes</span>
                  <span className="font-medium">{moneda(pedido.costoEstimado ?? 0, ajustes)}</span>
                </div>
              )}
              {(pedido.costoEstimado ?? 0) > 0 && (pedido.total ?? 0) > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Margen bruto</span>
                  <span className="font-medium text-emerald-600">
                    {(
                      ((pedido.total ?? 0) - (pedido.costoEstimado ?? 0)) /
                      (pedido.total ?? 1) *
                      100
                    ).toFixed(0)}
                    %
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {(pedido.notas || pedido.motivoCancelacion) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notas</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                {pedido.notas && <p>{pedido.notas}</p>}
                {pedido.motivoCancelacion && (
                  <p className="rounded-lg bg-destructive/10 p-3 text-destructive">
                    Cancelado: {pedido.motivoCancelacion}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Seguimiento</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {[
                { etiqueta: 'Enviado a cocina', valor: pedido.horaEnvioCocina },
                { etiqueta: 'Listo', valor: pedido.horaListo },
                { etiqueta: 'Entregado', valor: pedido.horaEntrega },
                { etiqueta: 'Cobrado', valor: pedido.horaCobro },
              ].map((etapa) => (
                <div key={etapa.etiqueta} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className={
                        etapa.valor
                          ? 'size-2 rounded-full bg-emerald-500'
                          : 'size-2 rounded-full bg-muted-foreground/30'
                      }
                    />
                    {etapa.etiqueta}
                  </span>
                  <span className="text-muted-foreground">
                    {etapa.valor ? fechaHora(etapa.valor) : '—'}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
