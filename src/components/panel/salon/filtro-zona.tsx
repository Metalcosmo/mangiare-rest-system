'use client'

import { LayoutGrid } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/** Filtro de zonas del salón que escribe `?zona=<id>` en la URL. */
export function FiltroZona({
  zonas,
  valor,
}: {
  zonas: Array<{ id: string; nombre: string }>
  valor: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const parametros = useSearchParams()

  const cambiar = (nuevo: string) => {
    const siguientes = new URLSearchParams(parametros.toString())
    if (nuevo === 'todas') siguientes.delete('zona')
    else siguientes.set('zona', nuevo)
    const cadena = siguientes.toString()
    router.replace(cadena ? `${pathname}?${cadena}` : pathname)
  }

  return (
    <Select value={valor} onValueChange={cambiar}>
      <SelectTrigger size="sm" className="w-[200px]" aria-label="Filtrar por zona">
        <LayoutGrid className="size-4 text-muted-foreground" />
        <SelectValue placeholder="Todas las zonas" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todas">Todas las zonas</SelectItem>
        {zonas.map((zona) => (
          <SelectItem key={zona.id} value={zona.id}>
            {zona.nombre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
