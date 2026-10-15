import { Ticket } from 'lucide-react'

import { BotonEliminar } from '@/components/panel/boton-eliminar'
import { DialogoRegistro } from '@/components/panel/dialogo-registro'
import { EstadoVacio } from '@/components/panel/estado-vacio'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fecha, moneda, numero } from '@/lib/formato'
import type { Ajustes } from '@/lib/payload'

export type FilaCupon = {
  id: string | number
  codigo: string
  descripcion?: string | null
  tipo: string
  valor: number
  minimoCompra?: number | null
  usosMaximos?: number | null
  usosActuales?: number | null
  validoDesde?: string | null
  validoHasta?: string | null
  activo?: boolean | null
}

/** Valor del cupón formateado según su tipo (porcentaje o monto). */
const valorTexto = (cupon: FilaCupon, ajustes: Ajustes): string =>
  cupon.tipo === 'porcentaje'
    ? `${numero(cupon.valor, 0)}%`
    : moneda(cupon.valor, ajustes)

/** Tabla de cupones con barra de uso y acciones. */
export function TablaCupones({
  cupones,
  opciones,
  ajustes,
  busqueda,
}: {
  cupones: FilaCupon[]
  opciones: Record<string, { label: string; value: string }[]>
  ajustes: Ajustes
  busqueda?: string
}) {
  if (cupones.length === 0) {
    return (
      <EstadoVacio
        titulo={busqueda ? 'Sin coincidencias' : 'Aún no hay cupones'}
        descripcion={
          busqueda
            ? `No encontramos cupones que coincidan con «${busqueda}».`
            : 'Crea códigos de descuento para tus promociones.'
        }
        icono={Ticket}
      >
        <DialogoRegistro recurso="cupones" opciones={opciones} etiqueta="Nuevo cupón" />
      </EstadoVacio>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Cupón</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">Mínimo</TableHead>
            <TableHead className="min-w-[12rem]">Uso</TableHead>
            <TableHead className="hidden lg:table-cell">Vigencia</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-[1%] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cupones.map((cupon) => {
            const maximos = Number(cupon.usosMaximos ?? 0)
            const usos = Number(cupon.usosActuales ?? 0)
            const tieneLimite = maximos > 0
            const avance = tieneLimite ? Math.min(100, (usos / maximos) * 100) : 0
            const agotado = tieneLimite && usos >= maximos

            return (
              <TableRow key={String(cupon.id)}>
                <TableCell className="min-w-[12rem]">
                  <p className="font-mono text-sm font-medium">{cupon.codigo}</p>
                  {cupon.descripcion && (
                    <p className="mt-0.5 line-clamp-1 max-w-[20rem] text-xs text-muted-foreground">
                      {cupon.descripcion}
                    </p>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {cupon.tipo === 'porcentaje' ? 'Porcentaje' : 'Monto fijo'}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right font-medium tabular-nums">
                  {valorTexto(cupon, ajustes)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums text-muted-foreground">
                  {moneda(Number(cupon.minimoCompra ?? 0), ajustes)}
                </TableCell>
                <TableCell>
                  {tieneLimite ? (
                    <div className="flex flex-col gap-1.5">
                      <Progress
                        value={avance}
                        className={agotado ? 'bg-destructive/20' : undefined}
                      />
                      <span
                        className={
                          agotado
                            ? 'text-xs font-medium tabular-nums text-destructive'
                            : 'text-xs tabular-nums text-muted-foreground'
                        }
                      >
                        {numero(usos)} de {numero(maximos)} usos
                        {agotado ? ' · agotado' : ` · ${porcentajeUso(avance)}`}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {numero(usos)} usos · sin límite
                    </span>
                  )}
                </TableCell>
                <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground lg:table-cell">
                  {cupon.validoDesde || cupon.validoHasta
                    ? `${fecha(cupon.validoDesde)} → ${fecha(cupon.validoHasta)}`
                    : 'Sin vigencia definida'}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={
                      cupon.activo
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'bg-muted text-muted-foreground'
                    }
                  >
                    {cupon.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <DialogoRegistro
                      recurso="cupones"
                      id={String(cupon.id)}
                      valores={{ ...cupon }}
                      opciones={opciones}
                      variante="editar"
                    />
                    <BotonEliminar
                      recurso="cupones"
                      id={String(cupon.id)}
                      nombre={cupon.codigo}
                    />
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

const porcentajeUso = (avance: number): string => `${Math.round(avance)}% usado`
