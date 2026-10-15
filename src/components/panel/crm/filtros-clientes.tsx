'use client'

import { X } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ETIQUETAS_CLIENTE, TODOS } from '@/components/panel/crm/constantes'

/** Envoltura etiquetada para cada control de filtro. */
function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {etiqueta}
      </span>
      {children}
    </div>
  )
}

/**
 * Filtros de la pestaña Clientes. Escriben `nivel` y `etiqueta` en la URL para
 * que el Server Component vuelva a consultar con el `where` correspondiente.
 */
export function FiltrosClientes({
  niveles,
}: {
  niveles: Array<{ label: string; value: string }>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const parametros = useSearchParams()

  const nivel = parametros.get('nivel') ?? ''
  const etiqueta = parametros.get('etiqueta') ?? ''
  const hayFiltros = Boolean(nivel || etiqueta || parametros.get('q'))

  const actualizar = (clave: string, valor: string) => {
    const nuevos = new URLSearchParams(parametros.toString())
    if (!valor || valor === TODOS) nuevos.delete(clave)
    else nuevos.set(clave, valor)
    const cadena = nuevos.toString()
    router.replace(cadena ? `${pathname}?${cadena}` : pathname)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Campo etiqueta="Nivel">
        <Select value={nivel || TODOS} onValueChange={(valor) => actualizar('nivel', valor)}>
          <SelectTrigger size="sm" className="w-[150px]">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos los niveles</SelectItem>
            {niveles.map((opcion) => (
              <SelectItem key={opcion.value} value={opcion.value}>
                {opcion.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Campo>

      <Campo etiqueta="Etiqueta">
        <Select
          value={etiqueta || TODOS}
          onValueChange={(valor) => actualizar('etiqueta', valor)}
        >
          <SelectTrigger size="sm" className="w-[180px]">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas las etiquetas</SelectItem>
            {ETIQUETAS_CLIENTE.map((opcion) => (
              <SelectItem key={opcion.value} value={opcion.value}>
                {opcion.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Campo>

      {hayFiltros && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.replace(pathname)}
          className="text-muted-foreground"
        >
          <X className="size-4" />
          Limpiar
        </Button>
      )}
    </div>
  )
}
