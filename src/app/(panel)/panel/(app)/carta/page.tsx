import { ChefHat, CircleSlash, Percent, Plus, Tags, UtensilsCrossed, Wand2 } from 'lucide-react'
import Link from 'next/link'

import { Buscador } from '@/components/panel/buscador'
import { FiltrosCarta } from '@/components/panel/carta/filtros-carta'
import { margenDe, TablaPlatillos, type PlatilloFila } from '@/components/panel/carta/tabla-platillos'
import { EncabezadoPagina } from '@/components/panel/encabezado-pagina'
import { TarjetaKpi } from '@/components/panel/tarjeta-kpi'
import { Button } from '@/components/ui/button'
import { requireRol } from '@/lib/auth'
import { numero, porcentaje } from '@/lib/formato'
import { idCrudo } from '@/lib/ids'
import { obtenerOpciones } from '@/lib/opciones'
import { obtenerAjustes, getPayloadClient } from '@/lib/payload'

export const metadata = { title: 'Carta y menú' }

type Busqueda = {
  q?: string
  categoria?: string
  disponible?: string
}

export default async function PaginaCarta({
  searchParams,
}: {
  searchParams: Promise<Busqueda>
}) {
  const { q, categoria, disponible } = await searchParams
  await requireRol('admin', 'gerente')

  const payload = await getPayloadClient()
  const [ajustes, opciones, resultado] = await Promise.all([
    obtenerAjustes(),
    obtenerOpciones(['categorias']),
    payload.find({
      collection: 'productos',
      depth: 1,
      limit: 0,
      pagination: false,
      sort: 'orden',
      overrideAccess: true,
    }),
  ])

  // Son pocos platillos: traemos todo y filtramos en memoria para poder
  // calcular los KPIs sobre la carta completa, no sólo sobre los resultados.
  const todos = resultado.docs as unknown as PlatilloFila[]
  const texto = (q ?? '').trim().toLowerCase()

  const filtrados = todos.filter((platillo) => {
    if (texto) {
      const nombre = (platillo.nombre ?? '').toLowerCase()
      const sku = (platillo.sku ?? '').toLowerCase()
      if (!nombre.includes(texto) && !sku.includes(texto)) return false
    }

    if (categoria && String(idCrudo(platillo.categoria) ?? '') !== categoria) return false

    if (disponible === '1' && platillo.disponible === false) return false
    if (disponible === '0' && platillo.disponible !== false) return false

    return true
  })

  const total = todos.length
  const noDisponibles = todos.filter((platillo) => platillo.disponible === false).length
  const conReceta = todos.filter(
    (platillo) => Array.isArray(platillo.receta) && platillo.receta.length > 0,
  ).length

  const conPrecio = todos.filter((platillo) => Number(platillo.precio ?? 0) > 0)
  const margenPromedio =
    conPrecio.length > 0
      ? conPrecio.reduce((suma, platillo) => suma + margenDe(platillo), 0) / conPrecio.length
      : 0

  return (
    <div>
      <EncabezadoPagina
        titulo="Carta y menú"
        descripcion="Administra los platillos, sus recetas, precios y la disponibilidad del día."
        icono={UtensilsCrossed}
      >
        <Button asChild variant="outline">
          <Link href="/panel/carta/grupos">
            <Wand2 className="size-4" />
            Opciones y modificadores
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/panel/carta/categorias">
            <Tags className="size-4" />
            Categorías
          </Link>
        </Button>
        <Button asChild>
          <Link href="/panel/carta/platillos/nuevo">
            <Plus className="size-4" />
            Nuevo platillo
          </Link>
        </Button>
      </EncabezadoPagina>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaKpi
          etiqueta="Platillos en la carta"
          valor={numero(total)}
          icono={UtensilsCrossed}
          detalle="Incluye bebidas y postres"
        />
        <TarjetaKpi
          etiqueta="No disponibles"
          valor={numero(noDisponibles)}
          icono={CircleSlash}
          acento={noDisponibles > 0 ? 'aviso' : 'exito'}
          detalle="Pausados para el servicio"
        />
        <TarjetaKpi
          etiqueta="Con receta definida"
          valor={numero(conReceta)}
          icono={ChefHat}
          acento="exito"
          detalle="Descuentan inventario"
        />
        <TarjetaKpi
          etiqueta="Margen promedio"
          valor={porcentaje(margenPromedio)}
          icono={Percent}
          detalle="Precio de venta vs. costo de receta"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Buscador placeholder="Buscar platillos por nombre o SKU…" />
        <FiltrosCarta
          categorias={opciones.categorias ?? []}
          categoria={categoria}
          disponible={disponible}
        />
      </div>

      <TablaPlatillos filas={filtrados} ajustes={ajustes} />
    </div>
  )
}
