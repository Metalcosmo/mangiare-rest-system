import type { LucideIcon } from 'lucide-react'
import type { Where } from 'payload'
import type { ReactNode } from 'react'

import { Buscador } from '@/components/panel/buscador'
import { DialogoRegistro } from '@/components/panel/dialogo-registro'
import { EncabezadoPagina } from '@/components/panel/encabezado-pagina'
import { TablaRecursos, type Fila } from '@/components/panel/tabla-recursos'
import { obtenerOpciones } from '@/lib/opciones'
import { obtenerAjustes, getPayloadClient } from '@/lib/payload'
import { obtenerRecurso, type Campo } from '@/lib/recursos'

type Props = {
  recurso: string
  titulo: string
  descripcion?: string
  icono?: LucideIcon
  /** Término de búsqueda actual (?q=). */
  busqueda?: string
  /** Campos sobre los que aplica la búsqueda. */
  camposBusqueda?: string[]
  /** Filtro adicional fijo para esta vista. */
  donde?: Where
  /** Acciones extra en el encabezado. */
  acciones?: ReactNode
  /** Controles extra junto al buscador (por ejemplo, filtros por estado). */
  filtros?: ReactNode
  mensajeVacio?: { titulo: string; descripcion?: string }
  limite?: number
}

/**
 * Página CRUD estándar: encabezado, buscador, botón de alta y tabla.
 * Reutiliza el formulario y la acción genéricos declarados en `lib/recursos`.
 */
export async function PaginaRecurso({
  recurso,
  titulo,
  descripcion,
  icono,
  busqueda,
  camposBusqueda = [],
  donde,
  acciones,
  filtros,
  mensajeVacio,
  limite,
}: Props) {
  const definicion = obtenerRecurso(recurso)
  if (!definicion) return null

  const payload = await getPayloadClient()
  const ajustes = await obtenerAjustes()

  const condiciones: Where[] = []
  if (donde) condiciones.push(donde)
  if (busqueda && camposBusqueda.length > 0) {
    condiciones.push({
      or: camposBusqueda.map((campo) => ({ [campo]: { like: busqueda } })),
    })
  }

  const { docs } = await payload.find({
    collection: definicion.coleccion as never,
    depth: definicion.profundidad ?? 1,
    limit: limite ?? definicion.limite ?? 200,
    pagination: false,
    sort: definicion.ordenPor,
    where: condiciones.length > 0 ? ({ and: condiciones } as Where) : undefined,
    overrideAccess: true,
  })

  const opciones = await obtenerOpciones(
    definicion.campos
      .filter((campo: Campo) => campo.tipo === 'relacion' && campo.fuente)
      .map((campo) => (campo as { fuente: string }).fuente),
  )

  return (
    <div>
      <EncabezadoPagina titulo={titulo} descripcion={descripcion} icono={icono}>
        {acciones}
        <DialogoRegistro
          recurso={recurso}
          opciones={opciones}
          etiqueta={`Nuevo ${definicion.singular.toLowerCase()}`}
        />
      </EncabezadoPagina>

      {(camposBusqueda.length > 0 || filtros) && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {camposBusqueda.length > 0 && (
            <Buscador placeholder={`Buscar ${definicion.plural.toLowerCase()}…`} />
          )}
          {filtros}
        </div>
      )}

      <TablaRecursos
        recurso={recurso}
        filas={docs as unknown as Fila[]}
        opciones={opciones}
        ajustes={ajustes}
        mensajeVacio={mensajeVacio}
      />
    </div>
  )
}
