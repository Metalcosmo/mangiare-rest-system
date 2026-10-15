'use client'

import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Button } from '@/components/ui/button'

/**
 * Navegación entre semanas del calendario de turnos.
 * Usa `?semana=<offset>` sobre la ruta actual conservando el resto de parámetros.
 */
export function NavegacionSemana({ offset, etiqueta }: { offset: number; etiqueta: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const parametros = useSearchParams()

  const ir = (semana: number) => {
    const nuevos = new URLSearchParams(parametros.toString())
    nuevos.set('tab', 'turnos')
    if (semana === 0) nuevos.delete('semana')
    else nuevos.set('semana', String(semana))
    nuevos.delete('desde')
    router.push(`${pathname}?${nuevos.toString()}`)
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" onClick={() => ir(offset - 1)} aria-label="Semana anterior">
        <ChevronLeft className="size-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => ir(0)}
        className="min-w-[13rem] justify-center gap-2 font-medium"
      >
        <CalendarRange className="size-4" />
        {etiqueta}
      </Button>
      <Button variant="outline" size="icon" onClick={() => ir(offset + 1)} aria-label="Semana siguiente">
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}
