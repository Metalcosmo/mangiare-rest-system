'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ESTADOS = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'sentada', label: 'Cliente en mesa' },
  { value: 'completada', label: 'Completada' },
  { value: 'cancelada', label: 'Cancelada' },
  { value: 'no_asistio', label: 'No se presentó' },
]

/** Filtros de la agenda: fecha (?fecha=) y estado (?estado=). */
export function FiltrosReservas({ fecha, estado }: { fecha: string; estado: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const parametros = useSearchParams()

  const actualizar = (clave: string, valor: string) => {
    const siguientes = new URLSearchParams(parametros.toString())
    if (valor) siguientes.set(clave, valor)
    else siguientes.delete(clave)
    const cadena = siguientes.toString()
    router.replace(cadena ? `${pathname}?${cadena}` : pathname)
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="filtro-fecha" className="text-xs text-muted-foreground">
          Fecha de la agenda
        </Label>
        <Input
          id="filtro-fecha"
          type="date"
          value={fecha}
          onChange={(evento) => actualizar('fecha', evento.target.value)}
          className="w-[170px]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Estado</span>
        <Select
          value={estado || 'todos'}
          onValueChange={(valor) => actualizar('estado', valor === 'todos' ? '' : valor)}
        >
          <SelectTrigger className="w-[200px]" aria-label="Filtrar por estado">
            <SelectValue placeholder="Todos los estados" />
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
    </div>
  )
}
