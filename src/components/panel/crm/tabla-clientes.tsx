import { Eye, Phone } from 'lucide-react'
import Link from 'next/link'

import { BotonEliminar } from '@/components/panel/boton-eliminar'
import { DialogoRegistro } from '@/components/panel/dialogo-registro'
import { EtiquetaEstado } from '@/components/panel/etiqueta-estado'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fecha, iniciales, moneda, numero } from '@/lib/formato'
import type { Ajustes } from '@/lib/payload'
import { cn } from '@/lib/utils'

/** Fila de cliente tal como la consume la tabla del CRM. */
export type FilaCliente = {
  id: string | number
  nombre?: string | null
  telefono?: string | null
  email?: string | null
  nivel?: string | null
  puntos?: number | null
  visitas?: number | null
  totalGastado?: number | null
  ticketPromedio?: number | null
  ultimaVisita?: string | null
}

/**
 * Tabla propia del CRM: combina avatar, nivel, métricas de lealtad y acciones
 * (ver ficha, editar y eliminar) reutilizando los componentes del panel.
 */
export function TablaClientes({
  filas,
  ajustes,
  mensajeVacio,
}: {
  filas: FilaCliente[]
  ajustes?: Ajustes | null
  mensajeVacio?: string
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="whitespace-nowrap">Cliente</TableHead>
            <TableHead className="whitespace-nowrap">Nivel</TableHead>
            <TableHead className="whitespace-nowrap text-right">Puntos</TableHead>
            <TableHead className="whitespace-nowrap text-right">Visitas</TableHead>
            <TableHead className="whitespace-nowrap text-right">Gasto total</TableHead>
            <TableHead className="whitespace-nowrap text-right">Ticket prom.</TableHead>
            <TableHead className="whitespace-nowrap">Última visita</TableHead>
            <TableHead className="w-[1%] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {filas.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                {mensajeVacio ?? 'Sin resultados con los filtros actuales.'}
              </TableCell>
            </TableRow>
          )}

          {filas.map((fila) => {
            const nombre = fila.nombre ?? 'Sin nombre'
            return (
              <TableRow key={String(fila.id)}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9">
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                        {iniciales(nombre)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <Link
                        href={`/panel/clientes/${fila.id}`}
                        className="block truncate font-medium hover:underline"
                      >
                        {nombre}
                      </Link>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        {fila.telefono ? (
                          <>
                            <Phone className="size-3" />
                            {fila.telefono}
                          </>
                        ) : (
                          (fila.email ?? 'Sin contacto')
                        )}
                      </span>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <EtiquetaEstado valor={fila.nivel ?? 'bronce'} />
                </TableCell>

                <TableCell className="text-right tabular-nums">
                  {numero(fila.puntos ?? 0)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {numero(fila.visitas ?? 0)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {moneda(fila.totalGastado ?? 0, ajustes)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {moneda(fila.ticketPromedio ?? 0, ajustes)}
                </TableCell>
                <TableCell className={cn('whitespace-nowrap text-muted-foreground')}>
                  {fecha(fila.ultimaVisita)}
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" asChild aria-label="Ver ficha">
                      <Link href={`/panel/clientes/${fila.id}`}>
                        <Eye className="size-4" />
                      </Link>
                    </Button>
                    <DialogoRegistro
                      recurso="clientes"
                      id={String(fila.id)}
                      valores={fila as unknown as Record<string, unknown>}
                      opciones={{}}
                      variante="editar"
                    />
                    <BotonEliminar recurso="clientes" id={String(fila.id)} nombre={nombre} />
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
