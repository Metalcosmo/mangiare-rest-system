import { ArrowLeft, Wand2 } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { FormularioGrupo, type GrupoInicial } from '@/components/panel/carta/formulario-grupo'
import { EncabezadoPagina } from '@/components/panel/encabezado-pagina'
import { Button } from '@/components/ui/button'
import { requireRol } from '@/lib/auth'
import { idNumero } from '@/lib/ids'
import { obtenerAjustes, getPayloadClient } from '@/lib/payload'

type Parametros = { id: string }

export default async function PaginaEditarGrupo({ params }: { params: Promise<Parametros> }) {
  await requireRol('admin', 'gerente')

  const { id } = await params
  const payload = await getPayloadClient()
  const ajustes = await obtenerAjustes()

  let grupo: GrupoInicial & { id: string | number } = { id }

  try {
    const encontrado = (await payload.findByID({
      collection: 'grupos-modificadores',
      id: idNumero(id),
      depth: 1,
      overrideAccess: true,
    })) as (GrupoInicial & { id: string | number }) | null

    if (!encontrado) notFound()
    grupo = encontrado
  } catch {
    notFound()
  }

  return (
    <div>
      <EncabezadoPagina
        titulo={grupo.nombre ? `Editar «${grupo.nombre}»` : 'Editar grupo'}
        descripcion="Cambia las opciones y sus precios. Los pedidos ya hechos conservan lo que se vendió."
        icono={Wand2}
      >
        <Button asChild variant="outline">
          <Link href="/panel/carta/grupos">
            <ArrowLeft className="size-4" />
            Volver a los grupos
          </Link>
        </Button>
      </EncabezadoPagina>

      <FormularioGrupo id={String(grupo.id)} inicial={grupo} ajustes={ajustes} />
    </div>
  )
}
