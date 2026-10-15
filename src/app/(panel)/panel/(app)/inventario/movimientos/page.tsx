import { ArrowDownToLine, ArrowLeft, ClipboardList, TriangleAlert } from 'lucide-react'
import Link from 'next/link'

import { DialogoRegistro } from '@/components/panel/dialogo-registro'
import { PaginaRecurso } from '@/components/panel/pagina-recurso'
import { TarjetaKpi } from '@/components/panel/tarjeta-kpi'
import { Button } from '@/components/ui/button'
import { requireRol } from '@/lib/auth'
import { moneda, numero } from '@/lib/formato'
import { obtenerOpciones } from '@/lib/opciones'
import { obtenerAjustes, getPayloadClient } from '@/lib/payload'

export const metadata = { title: 'Movimientos de inventario' }

type Movimiento = {
  id: number
  tipo?: string | null
  cantidad?: number | null
  costoUnitario?: number | null
}

const valorizar = (movimientos: Movimiento[]): number =>
  movimientos.reduce(
    (total, movimiento) =>
      total + Number(movimiento.cantidad ?? 0) * Number(movimiento.costoUnitario ?? 0),
    0,
  )

export default async function PaginaMovimientos({
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

  const hace7Dias = new Date()
  hace7Dias.setDate(hace7Dias.getDate() - 7)

  const { docs } = await payload.find({
    collection: 'movimientos-inventario',
    where: {
      and: [
        { tipo: { in: ['entrada', 'merma'] } },
        { fecha: { greater_than_equal: hace7Dias.toISOString() } },
      ],
    },
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: true,
  })

  const movimientos = docs as unknown as Movimiento[]
  const entradas = movimientos.filter((movimiento) => movimiento.tipo === 'entrada')
  const mermas = movimientos.filter((movimiento) => movimiento.tipo === 'merma')

  return (
    <div>
      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaKpi
          etiqueta="Entradas (7 días)"
          valor={numero(entradas.length)}
          detalle="Compras y devoluciones recibidas"
          icono={ArrowDownToLine}
          acento="exito"
        />
        <TarjetaKpi
          etiqueta="Valor de entradas"
          valor={moneda(valorizar(entradas), ajustes)}
          detalle="Últimos 7 días"
          icono={ClipboardList}
        />
        <TarjetaKpi
          etiqueta="Mermas (7 días)"
          valor={numero(mermas.length)}
          detalle="Registros de pérdida"
          icono={TriangleAlert}
          acento={mermas.length > 0 ? 'aviso' : 'exito'}
        />
        <TarjetaKpi
          etiqueta="Valor de mermas"
          valor={moneda(valorizar(mermas), ajustes)}
          detalle="Últimos 7 días"
          icono={TriangleAlert}
          acento={mermas.length > 0 ? 'peligro' : 'exito'}
        />
      </section>

      <PaginaRecurso
        recurso="movimientos"
        titulo="Movimientos de inventario"
        descripcion="Entradas, salidas, ajustes, mermas y consumo automático por ventas."
        icono={ClipboardList}
        busqueda={q}
        camposBusqueda={['motivo']}
        limite={100}
        acciones={
          <>
            <Button asChild variant="outline">
              <Link href="/panel/inventario">
                <ArrowLeft className="size-4" />
                Volver al inventario
              </Link>
            </Button>
            <DialogoRegistro
              recurso="movimientos"
              opciones={opciones}
              etiqueta="Registrar movimiento"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            />
          </>
        }
      />
    </div>
  )
}
