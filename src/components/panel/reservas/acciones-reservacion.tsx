'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import {
  asignarMesa,
  cambiarEstadoReservacion,
  type EstadoReservacion,
} from '@/actions/reservas'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ESTADOS: Array<{ value: EstadoReservacion; label: string }> = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'sentada', label: 'Cliente en mesa' },
  { value: 'completada', label: 'Completada' },
  { value: 'cancelada', label: 'Cancelada' },
  { value: 'no_asistio', label: 'No se presentó' },
]

export type OpcionMesa = { value: string; label: string }

type Props = {
  id: string
  estado: string
  mesaId: string | null
  /** Mesas compatibles con el número de comensales. */
  mesas: OpcionMesa[]
}

/** Acciones de una reservación: cambiar estado y asignar mesa sugerida. */
export function AccionesReservacion({ id, estado, mesaId, mesas }: Props) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState<'estado' | 'mesa' | null>(null)
  const [, iniciarTransicion] = useTransition()

  const aplicarEstado = (nuevo: string) => {
    if (nuevo === estado) return
    setOcupado('estado')
    iniciarTransicion(async () => {
      const resultado = await cambiarEstadoReservacion(id, nuevo as EstadoReservacion)
      setOcupado(null)
      if (resultado?.error) {
        toast.error(resultado.error)
        return
      }
      toast.success(resultado?.mensaje ?? 'Reservación actualizada.')
      router.refresh()
    })
  }

  const aplicarMesa = (nuevo: string) => {
    setOcupado('mesa')
    iniciarTransicion(async () => {
      const resultado = await asignarMesa(id, nuevo === 'ninguna' ? null : nuevo)
      setOcupado(null)
      if (resultado?.error) {
        toast.error(resultado.error)
        return
      }
      toast.success(resultado?.mensaje ?? 'Mesa actualizada.')
      router.refresh()
    })
  }

  const accionRapida =
    estado === 'pendiente'
      ? { etiqueta: 'Confirmar', destino: 'confirmada' }
      : estado === 'confirmada'
        ? { etiqueta: 'Sentar', destino: 'sentada' }
        : estado === 'sentada'
          ? { etiqueta: 'Completar', destino: 'completada' }
          : null

  return (
    <div className="flex flex-wrap items-end gap-2 pt-1">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-muted-foreground">Estado</span>
        <Select value={estado} onValueChange={aplicarEstado} disabled={ocupado !== null}>
          <SelectTrigger size="sm" className="w-[170px]" aria-label="Cambiar estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ESTADOS.map((opcion) => (
              <SelectItem key={opcion.value} value={opcion.value}>
                {opcion.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-muted-foreground">Mesa sugerida</span>
        <Select
          value={mesaId ?? 'ninguna'}
          onValueChange={aplicarMesa}
          disabled={ocupado !== null}
        >
          <SelectTrigger size="sm" className="w-[220px]" aria-label="Asignar mesa">
            <SelectValue placeholder="Sin asignar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ninguna">Sin asignar</SelectItem>
            {mesas.map((mesa) => (
              <SelectItem key={mesa.value} value={mesa.value}>
                {mesa.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {accionRapida && (
        <Button
          type="button"
          size="sm"
          disabled={ocupado !== null}
          onClick={() => aplicarEstado(accionRapida.destino)}
        >
          {ocupado === 'estado' && <Loader2 className="size-4 animate-spin" />}
          {accionRapida.etiqueta}
        </Button>
      )}

      {ocupado === 'mesa' && (
        <Loader2 className="mb-2 size-4 animate-spin text-muted-foreground" />
      )}
    </div>
  )
}
