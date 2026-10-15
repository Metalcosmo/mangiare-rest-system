import { ArrowLeft, Truck } from 'lucide-react'
import Link from 'next/link'

import { PaginaRecurso } from '@/components/panel/pagina-recurso'
import { Button } from '@/components/ui/button'
import { requireRol } from '@/lib/auth'

export const metadata = { title: 'Proveedores' }

export default async function PaginaProveedores({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  await requireRol('admin', 'gerente', 'cocina')

  return (
    <PaginaRecurso
      recurso="proveedores"
      titulo="Proveedores"
      descripcion="Contactos, condiciones de pago y días de entrega de cada proveedor."
      icono={Truck}
      busqueda={q}
      camposBusqueda={['nombre', 'contacto', 'telefono']}
      acciones={
        <Button asChild variant="outline">
          <Link href="/panel/inventario">
            <ArrowLeft className="size-4" />
            Volver al inventario
          </Link>
        </Button>
      }
    />
  )
}
