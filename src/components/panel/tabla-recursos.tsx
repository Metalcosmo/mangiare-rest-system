import type { ReactNode } from 'react'

import { BotonEliminar } from '@/components/panel/boton-eliminar'
import type { MapaOpciones } from '@/components/panel/campos'
import { DialogoRegistro } from '@/components/panel/dialogo-registro'
import { EstadoVacio } from '@/components/panel/estado-vacio'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fecha, fechaHora, moneda, numero } from '@/lib/formato'
import { etiquetaDe, type Ajustes } from '@/lib/payload'
import { obtenerRecurso, type Columna } from '@/lib/recursos'
import { cn } from '@/lib/utils'

export type Fila = Record<string, unknown> & { id: string | number }

function valorCelda(columna: Columna, fila: Fila, ajustes?: Ajustes | null): ReactNode {
  const valor = fila[columna.nombre]

  switch (columna.tipo) {
    case 'booleano':
      return valor ? (
        <Badge variant="secondary" className="border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
          Sí
        </Badge>
      ) : (
        <Badge variant="secondary" className="border-0 bg-muted text-muted-foreground">
          No
        </Badge>
      )
    case 'moneda':
      return moneda(Number(valor ?? 0), ajustes)
    case 'numero':
      return numero(Number(valor ?? 0), Number.isInteger(Number(valor ?? 0)) ? 0 : 2)
    case 'fecha':
      return fecha(valor)
    case 'fechaHora':
      return fechaHora(valor)
    case 'lista':
      return Array.isArray(valor) && valor.length > 0 ? valor.map(etiquetaDe).join(', ') : '—'
    default:
      return etiquetaDe(valor)
  }
}

/** Nombre legible de una fila, usado en los diálogos de confirmación. */
const nombreDe = (fila: Fila): string => etiquetaDe(fila)

export function TablaRecursos({
  recurso,
  filas,
  opciones,
  ajustes,
  mensajeVacio,
  acciones,
  onRowClick,
}: {
  recurso: string
  filas: Fila[]
  opciones: MapaOpciones
  ajustes?: Ajustes | null
  mensajeVacio?: { titulo: string; descripcion?: string }
  acciones?: ReactNode
  /** Enlaces u acciones extra por fila. */
  onRowClick?: (fila: Fila) => ReactNode
}) {
  const definicion = obtenerRecurso(recurso)
  if (!definicion) return null

  if (filas.length === 0 && !mensajeVacio) {
    return (
      <EstadoVacio
        titulo={`Aún no hay ${definicion.plural.toLowerCase()}`}
        descripcion={`Crea el primer registro de ${definicion.plural.toLowerCase()} para empezar.`}
      >
        <DialogoRegistro
          recurso={recurso}
          opciones={opciones}
          etiqueta={`Nuevo ${definicion.singular.toLowerCase()}`}
        />
      </EstadoVacio>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {definicion.columnas.map((columna) => (
              <TableHead key={columna.nombre} className={cn('whitespace-nowrap', columna.className)}>
                {columna.etiqueta}
              </TableHead>
            ))}
            <TableHead className="w-[1%] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.length === 0 && (
            <TableRow>
              <TableCell colSpan={definicion.columnas.length + 1} className="py-10 text-center text-sm text-muted-foreground">
                {mensajeVacio?.titulo ?? 'Sin resultados con los filtros actuales.'}
                {mensajeVacio?.descripcion && (
                  <span className="mt-1 block text-xs">{mensajeVacio.descripcion}</span>
                )}
              </TableCell>
            </TableRow>
          )}

          {filas.map((fila) => (
            <TableRow key={String(fila.id)}>
              {definicion.columnas.map((columna) => (
                <TableCell key={columna.nombre} className={cn('whitespace-nowrap', columna.className)}>
                  {valorCelda(columna, fila, ajustes)}
                </TableCell>
              ))}
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {onRowClick?.(fila)}
                  {acciones}
                  <DialogoRegistro
                    recurso={recurso}
                    id={String(fila.id)}
                    valores={fila}
                    opciones={opciones}
                    variante="editar"
                  />
                  <BotonEliminar recurso={recurso} id={String(fila.id)} nombre={nombreDe(fila)} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
