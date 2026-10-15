import { ClipboardList, Receipt, TrendingUp, Utensils } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { Where } from 'payload'

import { EncabezadoPagina } from '@/components/panel/encabezado-pagina'
import { EtiquetaEstado } from '@/components/panel/etiqueta-estado'
import { FiltrosPedidos } from '@/components/panel/pedidos/filtros-pedidos'
import { TarjetaKpi } from '@/components/panel/tarjeta-kpi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { requireUsuario } from '@/lib/auth'
import { fechaHora, moneda, numero } from '@/lib/formato'
import { etiquetaDe, getPayloadClient, obtenerAjustes } from '@/lib/payload'

export const metadata: Metadata = { title: 'Pedidos' }

const inicioDelDia = (desplazamiento = 0) => {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + desplazamiento)
  fecha.setHours(0, 0, 0, 0)
  return fecha
}

type Busqueda = {
  q?: string
  estado?: string
  canal?: string
  rango?: string
}

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<Busqueda>
}) {
  await requireUsuario()
  const filtros = await searchParams
  const payload = await getPayloadClient()
  const ajustes = await obtenerAjustes()

  const rango = filtros.rango ?? 'hoy'
  const desde =
    rango === 'semana' ? inicioDelDia(-6) : rango === 'mes' ? inicioDelDia(-29) : inicioDelDia()

  const condiciones: Where[] = [{ createdAt: { greater_than_equal: desde.toISOString() } }]
  if (filtros.estado) {
    condiciones.push({ estado: { equals: filtros.estado } })
  } else {
    // Los borradores son lo que la mesa todavía no manda al mesero: no son
    // pedidos. Se pueden ver eligiendo el estado «Borrador».
    condiciones.push({ estado: { not_equals: 'borrador' } })
  }
  if (filtros.canal) condiciones.push({ canal: { equals: filtros.canal } })
  if (filtros.q) {
    condiciones.push({
      or: [{ folio: { like: filtros.q } }, { clienteNombre: { like: filtros.q } }],
    })
  }

  const donde = { and: condiciones } as Where

  const [resultado, activos, cobrados] = await Promise.all([
    payload.find({
      collection: 'pedidos',
      where: donde,
      depth: 1,
      limit: 100,
      pagination: false,
      sort: '-createdAt',
      overrideAccess: true,
    }),
    payload.count({
      collection: 'pedidos',
      where: { estado: { in: ['nuevo', 'en_preparacion', 'listo', 'servido'] } } as Where,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'pedidos',
      where: {
        and: [
          { createdAt: { greater_than_equal: desde.toISOString() } },
          { estado: { equals: 'pagado' } },
        ],
      } as Where,
      depth: 0,
      limit: 1000,
      pagination: false,
      overrideAccess: true,
    }),
  ])

  const pedidos = resultado.docs
  const ventas = cobrados.docs.reduce((suma, pedido) => suma + (pedido.total ?? 0), 0)
  const ticketPromedio = cobrados.docs.length > 0 ? ventas / cobrados.docs.length : 0
  const comensales = pedidos.reduce((suma, pedido) => suma + (pedido.comensales ?? 1), 0)

  return (
    <div>
      <EncabezadoPagina
        titulo="Pedidos"
        descripcion="Historial y seguimiento de todos los canales: mesa, mostrador y para llevar."
        icono={ClipboardList}
      >
        <Button asChild variant="outline">
          <Link href="/panel/kds">
            <Utensils className="size-4" />
            Ver cocina
          </Link>
        </Button>
        <Button asChild>
          <Link href="/panel/pos">Nuevo pedido</Link>
        </Button>
      </EncabezadoPagina>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaKpi
          etiqueta="Pedidos del periodo"
          valor={numero(pedidos.length)}
          detalle={`${comensales} comensales`}
          icono={Receipt}
        />
        <TarjetaKpi
          etiqueta="Cobrado"
          valor={moneda(ventas, ajustes)}
          detalle={`${cobrados.docs.length} cuentas pagadas`}
          icono={TrendingUp}
          acento="exito"
        />
        <TarjetaKpi
          etiqueta="Ticket promedio"
          valor={moneda(ticketPromedio, ajustes)}
          icono={Receipt}
        />
        <TarjetaKpi
          etiqueta="Cuentas abiertas"
          valor={numero(activos.totalDocs)}
          detalle="En preparación o por cobrar"
          icono={Utensils}
          acento="aviso"
        />
      </div>

      <FiltrosPedidos />

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Folio</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Cliente / Mesa</TableHead>
              <TableHead className="text-right">Líneas</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[1%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pedidos.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                  No hay pedidos con estos filtros. Cambia el rango de fechas o el estado.
                </TableCell>
              </TableRow>
            )}

            {pedidos.map((pedido) => (
              <TableRow key={String(pedido.id)}>
                <TableCell className="font-medium">{pedido.folio}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {fechaHora(pedido.createdAt)}
                </TableCell>
                <TableCell>
                  <EtiquetaEstado valor={pedido.canal ?? 'mesa'} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>
                      {etiquetaDe(pedido.mesa)}
                      {pedido.ronda ? ` · R${pedido.ronda}` : ''}
                    </span>
                    {pedido.clienteNombre && (
                      <span className="text-xs text-muted-foreground">
                        Abierta por {pedido.clienteNombre}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary">{(pedido.items ?? []).length}</Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {moneda(pedido.total ?? 0, ajustes)}
                </TableCell>
                <TableCell>
                  <EtiquetaEstado valor={pedido.estado ?? 'nuevo'} />
                </TableCell>
                <TableCell>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/panel/pedidos/${pedido.id}`}>Ver</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
