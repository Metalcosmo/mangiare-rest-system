/**
 * Extrae el ID de una relación de Payload conservando su tipo original
 * (las colecciones SQLite usan IDs numéricos y validan el tipo al guardar).
 */
export const idCrudo = (valor: unknown): string | number | undefined => {
  if (valor === null || valor === undefined) return undefined
  if (typeof valor === 'object') {
    const id = (valor as { id?: string | number }).id
    return id === undefined || id === null ? undefined : id
  }
  if (typeof valor === 'string' || typeof valor === 'number') return valor
  return undefined
}

/** Clave estable de una relación para usar como índice de un Map. */
export const claveDe = (valor: unknown): string => String(idCrudo(valor) ?? '')

/**
 * ID numérico para escribir relaciones.
 * Las colecciones sobre SQLite (D1) usan IDs enteros, y los tipos generados
 * por Payload lo reflejan.
 */
export const idNumero = (valor: unknown): number => Number(idCrudo(valor))
