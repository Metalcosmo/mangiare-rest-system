import {
  ArrowRight,
  ClipboardList,
  Package,
  PackageX,
  ShoppingCart,
  TrendingDown,
  TriangleAlert,
  Truck,
} from 'lucide-react'
import Link from 'next/link'

import { DialogoRegistro } from '@/components/panel/dialogo-registro'
import { EncabezadoPagina } from '@/components/panel/encabezado-pagina'
import { PaginaRecurso } from '@/components/panel/pagina-recurso'
import { TarjetaKpi } from '@/components/panel/tarjeta-kpi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { requireRol } from '@/lib/auth'
import { moneda, numero } from '@/lib/formato'
import { obtenerOpciones } from '@/lib/opciones'
import { obtenerAjustes, getPayloadClient } from '@/lib/payload'

export const metadata = { title: 'Inventario' }

type Ingrediente = {
  id: number
  nombre: string
  sku?: string | null
  unidad?: string | null
  stockActual?: number | null
  stockMinimo?: number | null
  costoUnitario?: number | null
}

type Movimiento = {
  tipo?: string | null
  cantidad?: number | null
  costoUnitario?: number | null
}

const cobertura = (ingrediente: Ingrediente): number => {
  const minimo = Number(ingrediente.stockMinimo ?? 0)
  if (minimo <= 0) return 100
  return (Number(ingrediente.stockActual ?? 0) / minimo) * 100
}

export default async function PaginaInventario({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  await requireRol('admin', 'gerente', 'cocina')

  const payload = await getPayloadClient()
  const [ajustes, opciones] = await Promise.all([
    obtenerAjustes(),
    obtenerOpciones(['ingredientes']),
  ])

  const inicioHoy = new Date()
  inicioHoy.setHours(0, 0, 0, 0)

  const hace7Dias = new Date()
  hace7Dias.setDate(hace7Dias.getDate() - 7)

  const [resultado, consumoHoy, mermas7] = await Promise.all([
    // Se traen todos los ingredientes para comparar dos columnas que la API
    // de consulta no puede contrastar entre sí.
    payload.find({
      collection: 'ingredientes',
      depth: 1,
      limit: 0,
      pagination: false,
      sort: 'nombre',
      overrideAccess: true,
    }),
    payload.count({
      collection: 'movimientos-inventario',
      where: {
        and: [{ tipo: { equals: 'consumo' } }, { fecha: { greater_than_equal: inicioHoy.toISOString() } }],
      },
      overrideAccess: true,
    }),
    payload.find({
      collection: 'movimientos-inventario',
      where: {
        and: [
          { tipo: { equals: 'merma' } },
          { fecha: { greater_than_equal: hace7Dias.toISOString() } },
        ],
      },
      depth: 0,
      limit: 0,
      pagination: false,
      overrideAccess: true,
    }),
  ])

  const ingredientes = resultado.docs as unknown as Ingrediente[]

  const valorTotal = ingredientes.reduce(
    (total, ingrediente) =>
      total + Number(ingrediente.stockActual ?? 0) * Number(ingrediente.costoUnitario ?? 0),
    0,
  )

  const alertas = ingredientes
    .filter(
      (ingrediente) =>
        Number(ingrediente.stockMinimo ?? 0) > 0 &&
        Number(ingrediente.stockActual ?? 0) <= Number(ingrediente.stockMinimo ?? 0),
    )
    .sort((a, b) => cobertura(a) - cobertura(b))

  const valorMermas = (mermas7.docs as unknown as Movimiento[]).reduce(
    (total, movimiento) =>
      total + Number(movimiento.cantidad ?? 0) * Number(movimiento.costoUnitario ?? 0),
    0,
  )

  return (
    <div>
      <EncabezadoPagina
        titulo="Inventario"
        descripcion="Existencias, mínimos, proveedores y el libro de movimientos del almacén."
        icono={Package}
      >
        <Button asChild variant="outline">
          <Link href="/panel/inventario/proveedores">
            <Truck className="size-4" />
            Proveedores
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/panel/inventario/movimientos">
            <ClipboardList className="size-4" />
            Movimientos
          </Link>
        </Button>
      </EncabezadoPagina>

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaKpi
          etiqueta="Valor del inventario"
          valor={moneda(valorTotal, ajustes)}
          detalle="Existencia × costo unitario"
          icono={Package}
        />
        <TarjetaKpi
          etiqueta="Bajo mínimo"
          valor={numero(alertas.length)}
          detalle="Ingredientes por resurtir"
          icono={PackageX}
          acento={alertas.length > 0 ? 'peligro' : 'exito'}
        />
        <TarjetaKpi
          etiqueta="Consumo de hoy"
          valor={numero(consumoHoy.totalDocs)}
          detalle="Movimientos por ventas"
          icono={ShoppingCart}
          acento="exito"
        />
        <TarjetaKpi
          etiqueta="Mermas (7 días)"
          valor={moneda(valorMermas, ajustes)}
          detalle="Pérdidas valorizadas"
          icono={TrendingDown}
          acento={valorMermas > 0 ? 'aviso' : 'exito'}
        />
      </section>

      {alertas.length > 0 && (
        <section className="mb-8 overflow-hidden rounded-xl border border-amber-500/30 bg-card">
          <header className="flex items-center gap-2 border-b bg-amber-500/10 px-4 py-3">
            <TriangleAlert className="size-4 text-amber-600" />
            <div>
              <h2 className="text-sm font-semibold">Alerta de stock bajo</h2>
              <p className="text-xs text-muted-foreground">
                {numero(alertas.length)}{' '}
                {alertas.length === 1 ? 'ingrediente llegó' : 'ingredientes llegaron'} a su mínimo.
                Registra una entrada para resurtir.
              </p>
            </div>
          </header>

          <ul className="divide-y">
            {alertas.map((ingrediente) => {
              const porcentajeCobertura = Math.min(100, Math.max(0, cobertura(ingrediente)))
              const unidad = ingrediente.unidad ?? 'unidad'
              const critico = porcentajeCobertura < 50

              return (
                <li
                  key={String(ingrediente.id)}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium">{ingrediente.nombre}</span>
                      <Badge
                        variant="secondary"
                        className={
                          critico
                            ? 'border-0 bg-destructive/15 text-destructive'
                            : 'border-0 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                        }
                      >
                        {critico ? 'Crítico' : 'Bajo'}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Existencia {numero(Number(ingrediente.stockActual ?? 0), 2)} {unidad} · mínimo{' '}
                      {numero(Number(ingrediente.stockMinimo ?? 0), 2)} {unidad}
                    </p>
                    <Progress value={porcentajeCobertura} className="mt-2 h-1.5 max-w-md" />
                  </div>

                  <DialogoRegistro
                    recurso="movimientos"
                    opciones={opciones}
                    valores={{
                      ingrediente: String(ingrediente.id),
                      tipo: 'entrada',
                      costoUnitario: Number(ingrediente.costoUnitario ?? 0),
                    }}
                    etiqueta="Registrar entrada"
                    className="shrink-0"
                  />
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <PaginaRecurso
        recurso="ingredientes"
        titulo="Ingredientes"
        descripcion="Existencias, costos y mínimos de cada insumo del almacén."
        icono={Package}
        busqueda={q}
        camposBusqueda={['nombre', 'sku']}
        mensajeVacio={{
          titulo: 'Sin ingredientes que coincidan',
          descripcion: 'Ajusta la búsqueda o registra el primer insumo del almacén.',
        }}
        acciones={
          <Button asChild variant="ghost">
            <Link href="/panel/inventario/movimientos">
              Ver movimientos
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />
    </div>
  )
}
