import { Pencil, Plus } from 'lucide-react'
import Link from 'next/link'

import { BotonDisponible } from '@/components/panel/carta/boton-disponible'
import { EstadoVacio } from '@/components/panel/estado-vacio'
import { EtiquetaEstado } from '@/components/panel/etiqueta-estado'
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
import { moneda, porcentaje } from '@/lib/formato'
import { etiquetaDe, type Ajustes } from '@/lib/payload'
import { cn } from '@/lib/utils'

export type PlatilloFila = {
  id: string | number
  nombre?: string | null
  sku?: string | null
  categoria?: unknown
  estacion?: string | null
  precio?: number | null
  costoReceta?: number | null
  disponible?: boolean | null
  destacado?: boolean | null
  receta?: unknown[] | null
}

/** Margen bruto sobre el precio de venta comparado con el costo de la receta. */
export const margenDe = (fila: Pick<PlatilloFila, 'precio' | 'costoReceta'>): number => {
  const precio = Number(fila.precio ?? 0)
  if (precio <= 0) return 0
  return (precio - Number(fila.costoReceta ?? 0)) / precio
}

const colorMargen = (margen: number): string => {
  if (margen >= 0.6) return 'text-emerald-600 dark:text-emerald-400'
  if (margen >= 0.4) return 'text-amber-600 dark:text-amber-400'
  return 'text-destructive'
}

export function TablaPlatillos({
  filas,
  ajustes,
}: {
  filas: PlatilloFila[]
  ajustes?: Ajustes | null
}) {
  if (filas.length === 0) {
    return (
      <EstadoVacio
        titulo="Sin platillos que coincidan"
        descripcion="Ajusta los filtros o crea el primer platillo de la carta."
      >
        <Button asChild>
          <Link href="/panel/carta/platillos/nuevo">
            <Plus className="size-4" />
            Nuevo platillo
          </Link>
        </Button>
      </EstadoVacio>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Platillo</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Estación</TableHead>
            <TableHead className="text-right">Precio</TableHead>
            <TableHead className="text-right">Costo receta</TableHead>
            <TableHead className="text-right">Margen</TableHead>
            <TableHead>Disponible</TableHead>
            <TableHead className="w-[1%] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map((fila) => {
            const margen = margenDe(fila)
            const disponible = fila.disponible !== false
            const conReceta = Array.isArray(fila.receta) && fila.receta.length > 0

            return (
              <TableRow key={String(fila.id)}>
                <TableCell className="max-w-[22rem]">
                  <div className="flex flex-col">
                    <span className="truncate font-medium">{fila.nombre ?? '—'}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {fila.sku ? `SKU ${fila.sku}` : conReceta ? 'Con receta' : 'Sin receta'}
                      {fila.destacado ? ' · Destacado' : ''}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">{etiquetaDe(fila.categoria)}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <EtiquetaEstado valor={fila.estacion} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">
                  {moneda(fila.precio, ajustes)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums text-muted-foreground">
                  {conReceta ? moneda(fila.costoReceta, ajustes) : '—'}
                </TableCell>
                <TableCell
                  className={cn(
                    'whitespace-nowrap text-right font-medium tabular-nums',
                    conReceta && colorMargen(margen),
                  )}
                >
                  {conReceta ? porcentaje(margen) : '—'}
                </TableCell>
                <TableCell>
                  {disponible ? (
                    <Badge
                      variant="secondary"
                      className="border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    >
                      Disponible
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="border-0 bg-destructive/15 text-destructive"
                    >
                      No disponible
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <BotonDisponible
                      id={fila.id}
                      nombre={fila.nombre ?? 'platillo'}
                      disponible={disponible}
                    />
                    <Button variant="ghost" size="icon" asChild>
                      <Link
                        href={`/panel/carta/platillos/${fila.id}`}
                        aria-label={`Editar ${fila.nombre ?? 'platillo'}`}
                        title="Editar platillo"
                      >
                        <Pencil className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
