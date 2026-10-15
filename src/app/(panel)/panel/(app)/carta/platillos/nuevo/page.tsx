import { ArrowLeft, UtensilsCrossed } from 'lucide-react'
import Link from 'next/link'

import type { IngredienteReceta } from '@/components/panel/carta/editor-receta'
import { FormularioPlatillo } from '@/components/panel/carta/formulario-platillo'
import { EncabezadoPagina } from '@/components/panel/encabezado-pagina'
import { Button } from '@/components/ui/button'
import { requireRol } from '@/lib/auth'
import { obtenerOpciones } from '@/lib/opciones'
import { obtenerAjustes, getPayloadClient } from '@/lib/payload'
import type { Opcion } from '@/lib/recursos'

export const metadata = { title: 'Nuevo platillo' }

/** Ingredientes con su unidad y costo, listos para el editor de receta. */
const aIngredientes = (docs: unknown[]): IngredienteReceta[] =>
  (docs as Array<{ id: number; nombre: string; unidad?: string; costoUnitario?: number | null }>).map(
    (doc) => ({
      id: doc.id,
      nombre: doc.nombre,
      unidad: doc.unidad ?? 'unidad',
      costoUnitario: Number(doc.costoUnitario ?? 0),
    }),
  )

export default async function PaginaNuevoPlatillo() {
  await requireRol('admin', 'gerente')

  const payload = await getPayloadClient()
  const [ajustes, opciones, ingredientes, grupos] = await Promise.all([
    obtenerAjustes(),
    obtenerOpciones(['categorias']),
    payload.find({
      collection: 'ingredientes',
      depth: 0,
      limit: 0,
      pagination: false,
      sort: 'nombre',
      overrideAccess: true,
    }),
    payload.find({
      collection: 'grupos-modificadores',
      depth: 0,
      limit: 0,
      pagination: false,
      sort: 'nombre',
      overrideAccess: true,
    }),
  ])

  const opcionesGrupos: Opcion[] = (
    grupos.docs as unknown as Array<{ id: number; nombre: string }>
  ).map((grupo) => ({ value: String(grupo.id), label: grupo.nombre }))

  return (
    <div>
      <EncabezadoPagina
        titulo="Nuevo platillo"
        descripcion="Captura la información, la receta y las opciones de venta del platillo."
        icono={UtensilsCrossed}
      >
        <Button asChild variant="outline">
          <Link href="/panel/carta">
            <ArrowLeft className="size-4" />
            Volver a la carta
          </Link>
        </Button>
      </EncabezadoPagina>

      <FormularioPlatillo
        valores={{
          estacion: 'cocina',
          tiempoPreparacion: 10,
          disponible: true,
          destacado: false,
          controlaStock: true,
          rendimiento: 1,
        }}
        opciones={opciones}
        grupos={opcionesGrupos}
        ingredientes={aIngredientes(ingredientes.docs)}
        ajustes={ajustes}
      />
    </div>
  )
}
