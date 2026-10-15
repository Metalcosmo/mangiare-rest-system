import type { CollectionBeforeChangeHook, Payload, PayloadRequest } from 'payload'

import { idCrudo } from '../lib/ids'
import { redondear } from '../lib/inventario'
import { convertir, type Unidad } from '../lib/unidades'

type LineaReceta = {
  ingrediente?: unknown
  cantidad?: number | null
  unidad?: string | null
}

type IngredienteMinimo = {
  id: string | number
  unidad?: string | null
  costoUnitario?: number | null
}

/**
 * Calcula el costo de ingredientes de un platillo a partir de su receta,
 * convirtiendo las unidades de la receta a la unidad del inventario.
 */
export const calcularCostoReceta: CollectionBeforeChangeHook = async ({ data, req }) => {
  const receta = (data?.receta ?? []) as LineaReceta[]
  if (receta.length === 0) {
    data.costoReceta = 0
    return data
  }

  const ids = [
    ...new Set(
      receta
        .map((linea) => idCrudo(linea.ingrediente))
        .filter((id): id is string | number => id !== undefined),
    ),
  ]

  if (ids.length === 0) {
    data.costoReceta = 0
    return data
  }

  const { docs } = await req.payload.find({
    collection: 'ingredientes',
    where: { id: { in: ids } },
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })

  const porId = new Map(
    (docs as unknown as IngredienteMinimo[]).map((doc) => [String(doc.id), doc]),
  )

  let total = 0
  for (const linea of receta) {
    const ingrediente = porId.get(String(idCrudo(linea.ingrediente) ?? ''))
    if (!ingrediente) continue

    const unidadInventario = (ingrediente.unidad ?? 'unidad') as Unidad
    const unidadReceta = (linea.unidad ?? unidadInventario) as Unidad
    total +=
      convertir(linea.cantidad ?? 0, unidadReceta, unidadInventario) *
      (ingrediente.costoUnitario ?? 0)
  }

  data.costoReceta = redondear(total)
  return data
}

export type { Payload, PayloadRequest }
