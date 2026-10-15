'use client'

/**
 * Filtros de la carta: categoría y disponibilidad.
 * Mantienen la búsqueda (`?q=`) y el resto de parámetros en la URL.
 */

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Opcion } from '@/lib/recursos'

const TODAS = 'todas'

export function FiltrosCarta({
  categorias,
  categoria,
  disponible,
}: {
  categorias: Opcion[]
  categoria?: string
  disponible?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const parametros = useSearchParams()

  const cambiar = (clave: string, valor: string) => {
    const nuevos = new URLSearchParams(parametros.toString())
    if (!valor || valor === TODAS) nuevos.delete(clave)
    else nuevos.set(clave, valor)

    const cadena = nuevos.toString()
    router.push(cadena ? `${pathname}?${cadena}` : pathname)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={categoria || TODAS} onValueChange={(valor) => cambiar('categoria', valor)}>
        <SelectTrigger className="w-52" aria-label="Filtrar por categoría">
          <SelectValue placeholder="Categoría" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODAS}>Todas las categorías</SelectItem>
          {categorias.map((opcion) => (
            <SelectItem key={opcion.value} value={opcion.value}>
              {opcion.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={disponible || TODAS} onValueChange={(valor) => cambiar('disponible', valor)}>
        <SelectTrigger className="w-52" aria-label="Filtrar por disponibilidad">
          <SelectValue placeholder="Disponibilidad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODAS}>Toda la disponibilidad</SelectItem>
          <SelectItem value="1">Sólo disponibles</SelectItem>
          <SelectItem value="0">Sólo no disponibles</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
