'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'

import { Tabs } from '@/components/ui/tabs'

/**
 * Tabs del módulo de clientes sincronizadas con la URL (`?tab=`), de modo que
 * la pestaña activa sobreviva a recargas y a los filtros de búsqueda.
 */
export function TabsClientes({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const parametros = useSearchParams()

  const valor = parametros.get('tab') ?? 'clientes'

  const cambiar = (nuevo: string) => {
    const siguientes = new URLSearchParams(parametros.toString())
    if (nuevo === 'clientes') siguientes.delete('tab')
    else siguientes.set('tab', nuevo)
    const cadena = siguientes.toString()
    router.replace(cadena ? `${pathname}?${cadena}` : pathname)
  }

  return (
    <Tabs value={valor} onValueChange={cambiar} className="gap-6">
      {children}
    </Tabs>
  )
}
