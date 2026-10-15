import type { CollectionBeforeChangeHook } from 'payload'

import { redondear } from '../lib/inventario'

/** Niveles de lealtad según el gasto histórico del cliente. */
export const NIVELES = [
  { label: 'Bronce', value: 'bronce', minimo: 0 },
  { label: 'Plata', value: 'plata', minimo: 2500 },
  { label: 'Oro', value: 'oro', minimo: 8000 },
  { label: 'Platino', value: 'platino', minimo: 20000 },
]

export const nivelPorGasto = (totalGastado: number, visitas: number): string => {
  const gasto = totalGastado ?? 0
  const visita = visitas ?? 0
  let nivel = 'bronce'
  for (const escalon of NIVELES) {
    if (gasto >= escalon.minimo) nivel = escalon.value
  }
  // Un cliente muy frecuente sube de nivel aunque su ticket sea bajo.
  if (nivel === 'bronce' && visita >= 20) nivel = 'plata'
  if (nivel === 'plata' && visita >= 50) nivel = 'oro'
  return nivel
}

/** Recalcula ticket promedio y nivel antes de guardar un cliente. */
export const recalcularCliente: CollectionBeforeChangeHook = async ({ data, originalDoc }) => {
  const totalGastado = data.totalGastado ?? originalDoc?.totalGastado ?? 0
  const visitas = data.visitas ?? originalDoc?.visitas ?? 0

  data.ticketPromedio = visitas > 0 ? redondear(totalGastado / visitas) : 0
  data.nivel = nivelPorGasto(totalGastado, visitas)

  return data
}
