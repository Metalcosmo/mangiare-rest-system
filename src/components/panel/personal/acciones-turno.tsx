'use client'

import { CalendarCheck, Check, Clock, Loader2, MoreVertical, UserX } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { cambiarEstadoTurno } from '@/actions/personal'
import { DialogoRegistro } from '@/components/panel/dialogo-registro'
import { EtiquetaEstado } from '@/components/panel/etiqueta-estado'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { hhmm, iniciales } from '@/lib/formato'
import { ESTADOS_TURNO, ETIQUETA_TURNO, type EstadoTurno } from '@/lib/personal'
import type { MapaOpciones } from '@/lib/recursos'
import { cn } from '@/lib/utils'

/** Icono que representa visualmente cada estado del turno. */
const ICONO_ESTADO: Record<EstadoTurno, typeof Clock> = {
  programado: Clock,
  confirmado: CalendarCheck,
  completado: Check,
  ausente: UserX,
}

/** Datos planos de un turno, listos para cruzar del servidor al cliente. */
export type TurnoVista = {
  id: string | number
  empleadoId: string
  empleadoNombre: string
  iniciales: string
  fecha: string
  horaInicio: string
  horaFin: string
  horas: number
  puesto: string
  estado: string
  notas?: string | null
}

/** Menú de acciones rápidas para mover un turno entre estados. */
export function AccionesEstadoTurno({ turno }: { turno: TurnoVista }) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [abierto, setAbierto] = useState(false)

  const cambiar = (estado: EstadoTurno) => {
    setAbierto(false)
    iniciar(async () => {
      const resultado = await cambiarEstadoTurno(turno.id, estado)
      if (resultado.error) {
        toast.error(resultado.error)
        return
      }
      toast.success(resultado.mensaje ?? 'Turno actualizado.')
      router.refresh()
    })
  }

  return (
    <DropdownMenu open={abierto} onOpenChange={setAbierto}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Cambiar estado del turno de ${turno.empleadoNombre}`}
          disabled={pendiente}
        >
          {pendiente ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MoreVertical className="size-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Marcar turno como</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ESTADOS_TURNO.map((estado) => {
          const Icono = ICONO_ESTADO[estado]
          return (
            <DropdownMenuItem
              key={estado}
              disabled={estado === turno.estado}
              onSelect={() => cambiar(estado)}
            >
              <Icono className="size-4" />
              {ETIQUETA_TURNO[estado]}
              {estado === turno.estado && (
                <span className="ml-auto text-xs text-muted-foreground">Actual</span>
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Tarjeta compacta de un turno para la vista semanal. */
export function TarjetaTurno({
  turno,
  opciones,
  className,
}: {
  turno: TurnoVista
  opciones: MapaOpciones
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-3 shadow-xs transition-colors',
        turno.estado === 'ausente' && 'border-destructive/40 bg-destructive/5',
        turno.estado === 'completado' && 'opacity-80',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <Avatar size="sm">
            <AvatarFallback className="bg-primary/10 text-[0.65rem] font-semibold text-primary">
              {turno.iniciales || iniciales(turno.empleadoNombre)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{turno.empleadoNombre}</p>
            <p className="truncate text-xs capitalize text-muted-foreground">{turno.puesto}</p>
          </div>
        </div>
        <AccionesEstadoTurno turno={turno} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {hhmm(turno.horaInicio)} – {hhmm(turno.horaFin)}
          <span className="ml-1 text-muted-foreground/70">({turno.horas} h)</span>
        </span>
        <EtiquetaEstado valor={turno.estado} />
      </div>

      <div className="mt-2 flex items-center justify-end">
        <DialogoRegistro
          recurso="turnos"
          id={String(turno.id)}
          valores={{
            empleado: turno.empleadoId,
            fecha: turno.fecha,
            horaInicio: turno.horaInicio,
            horaFin: turno.horaFin,
            puesto: turno.puesto,
            estado: turno.estado,
            notas: turno.notas ?? '',
          }}
          opciones={opciones}
          variante="editar"
        />
      </div>
    </div>
  )
}
