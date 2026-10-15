import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CalendarClock,
  ChefHat,
  CircleDollarSign,
  LayoutGrid,
  Receipt,
  TrendingUp,
  Users,
} from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { Where } from 'payload'

import { EtiquetaEstado } from '@/components/panel/etiqueta-estado'
import { GraficoVentas, type PuntoVentas } from '@/components/panel/grafico-ventas'
import { TarjetaKpi } from '@/components/panel/tarjeta-kpi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { requireUsuario } from '@/lib/auth'
import { hora, moneda, numero, porcentaje } from '@/lib/formato'
import { getPayloadClient, obtenerAjustes } from '@/lib/payload'
import { nombreCompleto } from '@/lib/roles'

export const metadata: Metadata = { title: 'Tablero' }

const inicioDelDia = (desplazamiento = 0) => {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + desplazamiento)
  fecha.setHours(0, 0, 0, 0)
  return fecha
}

export default async function TableroPage() {
  const usuario = await requireUsuario()
  const payload = await getPayloadClient()
  const ajustes = await obtenerAjustes()

  const desde7 = inicioDelDia(-6)
  const hoy = inicioDelDia()
  const manana = inicioDelDia(1)

  const [pedidosSemana, mesas, ingredientes, reservasHoy, comandas, clientes, porConfirmar] =
    await Promise.all([
    payload.find({
      collection: 'pedidos',
      where: { createdAt: { greater_than_equal: desde7.toISOString() } } as Where,
      depth: 0,
      limit: 1000,
      pagination: false,
      sort: '-createdAt',
      overrideAccess: true,
    }),
    payload.find({
      collection: 'mesas',
      where: { activa: { equals: true } } as Where,
      depth: 1,
      limit: 200,
      pagination: false,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'ingredientes',
      where: { activo: { equals: true } } as Where,
      depth: 1,
      limit: 400,
      pagination: false,
      sort: 'stockActual',
      overrideAccess: true,
    }),
    payload.find({
      collection: 'reservaciones',
      where: {
        and: [
          { fecha: { greater_than_equal: hoy.toISOString() } },
          { fecha: { less_than: manana.toISOString() } },
          { estado: { not_in: ['cancelada', 'no_asistio'] } },
        ],
      } as Where,
      depth: 1,
      limit: 50,
      pagination: false,
      sort: 'hora',
      overrideAccess: true,
    }),
    payload.find({
      collection: 'pedidos',
      where: { estado: { in: ['nuevo', 'en_preparacion', 'listo'] } } as Where,
      depth: 0,
      limit: 100,
      pagination: false,
      sort: 'createdAt',
      overrideAccess: true,
    }),
    payload.count({ collection: 'clientes', overrideAccess: true }),
    payload.count({
      collection: 'pedidos',
      where: { estado: { equals: 'por_confirmar' } } as Where,
      overrideAccess: true,
    }),
  ])

  const pedidos = pedidosSemana.docs

  const pedidosHoy = pedidos.filter((pedido) => new Date(pedido.createdAt) >= hoy)
  const pagadosHoy = pedidosHoy.filter((pedido) => pedido.estado === 'pagado')
  const ventasHoy = pagadosHoy.reduce((suma, pedido) => suma + (pedido.total ?? 0), 0)
  const ventasAyer = pedidos
    .filter((pedido) => {
      const fecha = new Date(pedido.createdAt)
      return fecha >= inicioDelDia(-1) && fecha < hoy && pedido.estado === 'pagado'
    })
    .reduce((suma, pedido) => suma + (pedido.total ?? 0), 0)

  const tendencia = ventasAyer > 0 ? ((ventasHoy - ventasAyer) / ventasAyer) * 100 : null
  const ticketPromedio = pagadosHoy.length > 0 ? ventasHoy / pagadosHoy.length : 0
  const comensalesHoy = pedidosHoy.reduce((suma, pedido) => suma + (pedido.comensales ?? 1), 0)

  // Ventas por día de los últimos 7 días.
  const serie: PuntoVentas[] = []
  for (let desplazamiento = -6; desplazamiento <= 0; desplazamiento += 1) {
    const inicio = inicioDelDia(desplazamiento)
    const fin = inicioDelDia(desplazamiento + 1)
    const delDia = pedidos.filter((pedido) => {
      const fecha = new Date(pedido.createdAt)
      return fecha >= inicio && fecha < fin
    })
    serie.push({
      dia: new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric' }).format(inicio),
      ventas:
        Math.round(
          delDia
            .filter((pedido) => pedido.estado === 'pagado')
            .reduce((suma, pedido) => suma + (pedido.total ?? 0), 0) * 100,
        ) / 100,
      pedidos: delDia.length,
    })
  }

  // Platillos más vendidos de la semana.
  const conteoPlatillos = new Map<string, { nombre: string; cantidad: number; ingreso: number }>()
  for (const pedido of pedidos) {
    // Lo cancelado no se vendió, y lo que espera al mesero todavía no es una venta.
    if (pedido.estado === 'cancelado' || pedido.estado === 'por_confirmar') continue
    for (const item of pedido.items ?? []) {
      const clave = item.nombre ?? 'Sin nombre'
      const actual = conteoPlatillos.get(clave) ?? { nombre: clave, cantidad: 0, ingreso: 0 }
      actual.cantidad += item.cantidad ?? 0
      actual.ingreso += item.subtotal ?? 0
      conteoPlatillos.set(clave, actual)
    }
  }
  const topPlatillos = [...conteoPlatillos.values()]
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 6)
  const maximoVendido = topPlatillos[0]?.cantidad ?? 1

  // Salón
  const conteoMesas = mesas.docs.reduce<Record<string, number>>((acumulado, mesa) => {
    const estado = mesa.estado ?? 'libre'
    acumulado[estado] = (acumulado[estado] ?? 0) + 1
    return acumulado
  }, {})
  const totalMesas = mesas.docs.length
  const ocupadas = conteoMesas.ocupada ?? 0
  const ocupacion = totalMesas > 0 ? ocupadas / totalMesas : 0

  // Inventario
  const bajoMinimo = ingredientes.docs.filter(
    (ingrediente) =>
      (ingrediente.stockActual ?? 0) <= (ingrediente.stockMinimo ?? 0) &&
      (ingrediente.stockMinimo ?? 0) > 0,
  )
  const valorInventario = ingredientes.docs.reduce(
    (suma, ingrediente) =>
      suma + (ingrediente.stockActual ?? 0) * (ingrediente.costoUnitario ?? 0),
    0,
  )

  const nombrePila = nombreCompleto(usuario).split(' ')[0]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Buen día, {nombrePila}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumen de {ajustes.nombreComercial} ·{' '}
            {new Intl.DateTimeFormat('es-MX', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            }).format(new Date())}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/panel/kds">
              <ChefHat className="size-4" />
              Cocina
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/panel/pos">
              Abrir punto de venta
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      {porConfirmar.totalDocs > 0 && (
        <Card className="border-amber-500/60 bg-amber-500/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
                <BellRing className="size-5" />
              </span>
              <div>
                <p className="font-medium">
                  {porConfirmar.totalDocs === 1
                    ? '1 pedido espera la confirmación de un mesero'
                    : `${porConfirmar.totalDocs} pedidos esperan la confirmación de un mesero`}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Los pedidos hechos desde el código QR no llegan a cocina hasta que se aprueban.
                </p>
              </div>
            </div>
            <Button asChild size="sm" className="shrink-0">
              <Link href="/panel/mesero?vista=confirmar">
                Revisar pedidos
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaKpi
          etiqueta="Ventas de hoy"
          valor={moneda(ventasHoy, ajustes)}
          detalle={`${pagadosHoy.length} cuentas cobradas`}
          icono={CircleDollarSign}
          tendencia={tendencia}
          acento="exito"
        />
        <TarjetaKpi
          etiqueta="Pedidos de hoy"
          valor={numero(pedidosHoy.length)}
          detalle={`${comandas.totalDocs} comandas activas`}
          icono={Receipt}
          acento="primario"
        />
        <TarjetaKpi
          etiqueta="Ticket promedio"
          valor={moneda(ticketPromedio, ajustes)}
          detalle={`${numero(comensalesHoy)} comensales atendidos`}
          icono={TrendingUp}
        />
        <TarjetaKpi
          etiqueta="Ocupación del salón"
          valor={porcentaje(ocupacion)}
          detalle={`${ocupadas} de ${totalMesas} mesas`}
          icono={LayoutGrid}
          acento={ocupacion > 0.8 ? 'aviso' : 'primario'}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ventas de los últimos 7 días</CardTitle>
            <CardDescription>
              Total cobrado por día. La línea de pedidos incluye todas las comandas abiertas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GraficoVentas datos={serie} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Platillos más vendidos</CardTitle>
            <CardDescription>Últimos 7 días por cantidad servida</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {topPlatillos.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Todavía no hay ventas registradas esta semana.
              </p>
            )}
            {topPlatillos.map((platillo) => (
              <div key={platillo.nombre} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate pr-2 font-medium">{platillo.nombre}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {platillo.cantidad} · {moneda(platillo.ingreso, ajustes)}
                  </span>
                </div>
                <Progress value={(platillo.cantidad / maximoVendido) * 100} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Salón</CardTitle>
              <CardDescription>Estado actual de las mesas</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/panel/salon">Ver mapa</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {[
              { clave: 'libre', etiqueta: 'Libres' },
              { clave: 'ocupada', etiqueta: 'Ocupadas' },
              { clave: 'reservada', etiqueta: 'Reservadas' },
              { clave: 'limpieza', etiqueta: 'Por limpiar' },
            ].map((fila) => (
              <div key={fila.clave} className="flex items-center justify-between text-sm">
                <EtiquetaEstado valor={fila.clave} />
                <span className="font-medium">{conteoMesas[fila.clave] ?? 0}</span>
              </div>
            ))}
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Capacidad total</span>
              <span className="font-medium">
                {numero(mesas.docs.reduce((suma, mesa) => suma + (mesa.capacidad ?? 0), 0))} lugares
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Comandas activas</CardTitle>
              <CardDescription>Lo que está en cocina ahora mismo</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/panel/kds">Abrir KDS</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {comandas.docs.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No hay comandas pendientes. Buen momento para revisar la carta.
              </p>
            )}
            {comandas.docs.slice(0, 5).map((comanda) => (
              <Link
                key={String(comanda.id)}
                href={`/panel/pedidos/${comanda.id}`}
                className="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:border-primary"
              >
                <span className="flex flex-col">
                  <span className="font-medium">{comanda.folio}</span>
                  <span className="text-xs text-muted-foreground">
                    {(comanda.items ?? []).length} líneas ·{' '}
                    {comanda.canal === 'mesa' ? 'en mesa' : comanda.canal}
                  </span>
                </span>
                <EtiquetaEstado valor={comanda.estado} />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Alertas</CardTitle>
              <CardDescription>Inventario y reservaciones</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/panel/inventario">Inventario</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-lg bg-muted/60 p-3 text-sm">
              <span className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-600" />
                Bajo mínimo
              </span>
              <Badge variant="secondary">{bajoMinimo.length}</Badge>
            </div>

            {bajoMinimo.slice(0, 3).map((ingrediente) => (
              <div key={String(ingrediente.id)} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate pr-2 font-medium">{ingrediente.nombre}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {numero(ingrediente.stockActual ?? 0, 1)} / {numero(ingrediente.stockMinimo ?? 0, 1)}{' '}
                    {ingrediente.unidad}
                  </span>
                </div>
                <Progress
                  value={
                    (ingrediente.stockMinimo ?? 0) > 0
                      ? Math.min(
                          100,
                          ((ingrediente.stockActual ?? 0) / (ingrediente.stockMinimo ?? 1)) * 100,
                        )
                      : 0
                  }
                  className="h-1.5"
                />
              </div>
            ))}

            <Separator />

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <CircleDollarSign className="size-4" />
                Valor del almacén
              </span>
              <span className="font-medium">{moneda(valorInventario, ajustes)}</span>
            </div>

            <Separator />

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarClock className="size-4" />
                  Reservas de hoy
                </span>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/panel/reservas">Ver</Link>
                </Button>
              </div>
              {reservasHoy.docs.slice(0, 3).map((reserva) => (
                <div key={String(reserva.id)} className="flex items-center justify-between text-xs">
                  <span className="truncate pr-2">
                    {hora(`2000-01-01T${reserva.hora}:00`)} · {reserva.nombreCliente}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {reserva.personas} pax
                  </span>
                </div>
              ))}
              {reservasHoy.docs.length === 0 && (
                <p className="text-xs text-muted-foreground">Sin reservaciones para hoy.</p>
              )}
            </div>

            <Separator />

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Users className="size-4" />
                Clientes registrados
              </span>
              <span className="font-medium">{numero(clientes.totalDocs)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
