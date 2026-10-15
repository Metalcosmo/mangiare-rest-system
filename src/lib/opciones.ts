import { etiquetaDe, getPayloadClient } from './payload'
import type { MapaOpciones, Opcion } from './recursos'

type FuenteConfig = {
  coleccion: string
  /** Campos que se pueden usar como etiqueta, en orden de preferencia. */
  etiquetas: string[]
  ordenPor?: string
  limite?: number
  /** Texto adicional entre paréntesis, por ejemplo la unidad del ingrediente. */
  sufijo?: string
}

const FUENTES: Record<string, FuenteConfig> = {
  categorias: { coleccion: 'categorias', etiquetas: ['nombre'], ordenPor: 'orden' },
  proveedores: { coleccion: 'proveedores', etiquetas: ['nombre'], ordenPor: 'nombre' },
  zonas: { coleccion: 'zonas', etiquetas: ['nombre'], ordenPor: 'orden' },
  mesas: { coleccion: 'mesas', etiquetas: ['nombre'], ordenPor: 'nombre' },
  usuarios: { coleccion: 'users', etiquetas: ['nombre', 'email'], ordenPor: 'nombre' },
  clientes: { coleccion: 'clientes', etiquetas: ['nombre'], ordenPor: 'nombre' },
  productos: { coleccion: 'productos', etiquetas: ['nombre'], ordenPor: 'nombre' },
  ingredientes: {
    coleccion: 'ingredientes',
    etiquetas: ['nombre'],
    ordenPor: 'nombre',
    sufijo: 'unidad',
  },
  cupones: { coleccion: 'cupones', etiquetas: ['codigo'], ordenPor: 'codigo' },
}

/**
 * Carga las opciones de las relaciones que necesita un formulario.
 * Devuelve un mapa `{ fuente: [{ label, value }] }`.
 */
export async function obtenerOpciones(fuentes: string[]): Promise<MapaOpciones> {
  const payload = await getPayloadClient()
  const mapa: MapaOpciones = {}

  await Promise.all(
    [...new Set(fuentes)].map(async (fuente) => {
      const config = FUENTES[fuente]
      if (!config) {
        mapa[fuente] = []
        return
      }

      const { docs } = await payload.find({
        collection: config.coleccion as never,
        depth: 0,
        limit: config.limite ?? 300,
        pagination: false,
        sort: config.ordenPor,
        overrideAccess: true,
      })

      mapa[fuente] = (docs as unknown as Array<Record<string, unknown>>).map((doc) => {
        const principal =
          config.etiquetas
            .map((campo) => doc[campo])
            .filter((valor) => valor !== null && valor !== undefined)
            .map(String)
            .join(' ') || etiquetaDe(doc)

        const sufijo = config.sufijo ? doc[config.sufijo] : undefined

        return {
          value: String(doc.id),
          label: sufijo ? `${principal} (${String(sufijo)})` : principal,
        } satisfies Opcion
      })
    }),
  )

  return mapa
}

/** Fuentes de relación que usa cada recurso del panel. */
export const fuentesDe = (campos: ReadonlyArray<{ tipo: string; fuente?: string }>): string[] =>
  campos
    .filter((campo) => campo.tipo === 'relacion' && campo.fuente)
    .map((campo) => campo.fuente as string)
