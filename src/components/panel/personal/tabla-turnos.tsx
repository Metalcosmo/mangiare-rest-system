import { BotonEliminar } from '@/components/panel/boton-eliminar'
import { DialogoRegistro } from '@/components/panel/dialogo-registro'
import { EtiquetaEstado } from '@/components/panel/etiqueta-estado'
import type { TurnoVista } from '@/components/panel/personal/acciones-turno'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fecha, hhmm, numero } from '@/lib/formato'
import type { MapaOpciones } from '@/lib/recursos'

/** Tabla compacta con todos los turnos de la semana y sus acciones. */
export function TablaTurnosSemana({
  turnos,
  opciones,
}: {
  turnos: TurnoVista[]
  opciones: MapaOpciones
}) {
  const ordenados = [...turnos].sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio.localeCompare(b.horaInicio),
  )

  const valores = (turno: TurnoVista) => ({
    empleado: turno.empleadoId,
    fecha: turno.fecha,
    horaInicio: turno.horaInicio,
    horaFin: turno.horaFin,
    puesto: turno.puesto,
    estado: turno.estado,
    notas: turno.notas ?? '',
  })

  if (ordenados.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card px-6 py-10 text-center">
        <p className="text-sm font-medium">Sin turnos en esta semana</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Programa el primero con el botón «Programar turno».
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Empleado</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Entrada</TableHead>
            <TableHead>Salida</TableHead>
            <TableHead className="text-right">Horas</TableHead>
            <TableHead>Puesto</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-[1%] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordenados.map((turno) => (
            <TableRow key={String(turno.id)}>
              <TableCell className="whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <Avatar size="sm">
                    <AvatarFallback className="bg-primary/10 text-[0.65rem] font-semibold text-primary">
                      {turno.iniciales}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{turno.empleadoNombre}</span>
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap capitalize">{fecha(turno.fecha)}</TableCell>
              <TableCell className="whitespace-nowrap tabular-nums">
                {hhmm(turno.horaInicio)}
              </TableCell>
              <TableCell className="whitespace-nowrap tabular-nums">{hhmm(turno.horaFin)}</TableCell>
              <TableCell className="whitespace-nowrap text-right tabular-nums">
                {numero(turno.horas, turno.horas % 1 === 0 ? 0 : 2)}
              </TableCell>
              <TableCell className="whitespace-nowrap capitalize">{turno.puesto}</TableCell>
              <TableCell>
                <EtiquetaEstado valor={turno.estado} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <DialogoRegistro
                    recurso="turnos"
                    id={String(turno.id)}
                    valores={valores(turno)}
                    opciones={opciones}
                    variante="editar"
                  />
                  <BotonEliminar
                    recurso="turnos"
                    id={String(turno.id)}
                    nombre={`${turno.empleadoNombre} · ${fecha(turno.fecha)}`}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
