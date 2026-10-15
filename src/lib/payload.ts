import config from '@payload-config'
import { getPayload } from 'payload'

/** Instancia de Payload (Local API) para Server Components y Server Actions. */
export const getPayloadClient = async () => getPayload({ config })

export type Ajustes = {
  nombreComercial?: string | null
  eslogan?: string | null
  logo?: unknown
  colorPrimario?: string | null
  colorSecundario?: string | null
  telefono?: string | null
  email?: string | null
  direccion?: string | null
  instagram?: string | null
  moneda?: string | null
  simboloMoneda?: string | null
  impuestoPorcentaje?: number | null
  impuestoIncluido?: boolean | null
  servicioPorcentaje?: number | null
  propinasSugeridas?: Array<{ valor?: number | null }> | null
  puntosPorUnidad?: number | null
  valorPunto?: number | null
  tiempoEstimadoMinutos?: number | null
  aceptaPedidos?: boolean | null
  requiereAprobacionMesa?: boolean | null
  aforoMaximo?: number | null
  horarios?: Array<{ dia?: string; abre?: string; cierra?: string; cerrado?: boolean }> | null
  mensajeBienvenida?: string | null
  mensajePie?: string | null
  notaServicio?: string | null
  permitirPropinaCliente?: boolean | null
  encabezadoTicket?: string | null
  pieTicket?: string | null
  identificacionFiscal?: string | null
}

/** Ajustes globales del restaurante con valores por defecto sensatos. */
export async function obtenerAjustes(): Promise<Ajustes> {
  const payload = await getPayloadClient()
  const ajustes = (await payload.findGlobal({
    slug: 'ajustes',
    depth: 1,
    overrideAccess: true,
  })) as Ajustes | null

  return {
    nombreComercial: 'Mangiare',
    moneda: 'MXN',
    simboloMoneda: '$',
    impuestoPorcentaje: 16,
    impuestoIncluido: true,
    puntosPorUnidad: 1,
    tiempoEstimadoMinutos: 25,
    colorPrimario: '#c2410c',
    aceptaPedidos: true,
    requiereAprobacionMesa: true,
    ...(ajustes ?? {}),
  }
}

/** Etiqueta legible para cualquier documento o relación de Payload. */
export function etiquetaDe(valor: unknown): string {
  if (valor === null || valor === undefined) return '—'
  if (typeof valor === 'string' || typeof valor === 'number') return String(valor)
  if (typeof valor === 'object') {
    const doc = valor as Record<string, unknown>
    const candidato =
      doc.nombre ??
      doc.nombreComercial ??
      doc.nombreCliente ??
      doc.codigo ??
      doc.folio ??
      doc.email ??
      doc.id
    return candidato === undefined || candidato === null ? '—' : String(candidato)
  }
  return String(valor)
}
