import { ArrowLeft, Wand2 } from 'lucide-react'
import Link from 'next/link'

import { FormularioGrupo } from '@/components/panel/carta/formulario-grupo'
import { EncabezadoPagina } from '@/components/panel/encabezado-pagina'
import { Button } from '@/components/ui/button'
import { requireRol } from '@/lib/auth'
import { obtenerAjustes } from '@/lib/payload'

export const metadata = { title: 'Nuevo grupo de opciones' }

export default async function PaginaNuevoGrupo() {
  await requireRol('admin', 'gerente')

  const ajustes = await obtenerAjustes()

  return (
    <div>
      <EncabezadoPagina
        titulo="Nuevo grupo de opciones"
        descripcion="Define las tallas, los extras o el término de cocción y cuánto suma cada opción."
        icono={Wand2}
      >
        <Button asChild variant="outline">
          <Link href="/panel/carta/grupos">
            <ArrowLeft className="size-4" />
            Volver a los grupos
          </Link>
        </Button>
      </EncabezadoPagina>

      <FormularioGrupo inicial={{ tipo: 'unica' }} ajustes={ajustes} />
    </div>
  )
}
