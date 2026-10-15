import { ArrowLeft, Tags } from 'lucide-react'
import Link from 'next/link'

import { PaginaRecurso } from '@/components/panel/pagina-recurso'
import { Button } from '@/components/ui/button'
import { requireRol } from '@/lib/auth'

export const metadata = { title: 'Categorías de la carta' }

export default async function PaginaCategorias({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  await requireRol('admin', 'gerente')

  return (
    <PaginaRecurso
      recurso="categorias"
      titulo="Categorías de la carta"
      descripcion="Agrupan los platillos y definen el orden en que aparecen en la carta y el POS."
      icono={Tags}
      busqueda={q}
      camposBusqueda={['nombre']}
      acciones={
        <Button asChild variant="outline">
          <Link href="/panel/carta">
            <ArrowLeft className="size-4" />
            Volver a la carta
          </Link>
        </Button>
      }
    />
  )
}
