/**
 * Unidades de medida soportadas por el inventario y las recetas.
 * Permite convertir automáticamente entre unidades de la misma familia
 * (por ejemplo, una receta que pide 200 g de un ingrediente que se
 * compra por kilogramo).
 */
export type Unidad = 'g' | 'kg' | 'ml' | 'l' | 'unidad' | 'porcion'

export const UNIDADES: Array<{ label: string; value: Unidad }> = [
  { label: 'Gramos (g)', value: 'g' },
  { label: 'Kilogramos (kg)', value: 'kg' },
  { label: 'Mililitros (ml)', value: 'ml' },
  { label: 'Litros (l)', value: 'l' },
  { label: 'Unidad', value: 'unidad' },
  { label: 'Porción', value: 'porcion' },
]

type Familia = 'masa' | 'volumen' | 'conteo'

const BASE: Record<Unidad, { familia: Familia; factor: number }> = {
  g: { familia: 'masa', factor: 1 },
  kg: { familia: 'masa', factor: 1000 },
  ml: { familia: 'volumen', factor: 1 },
  l: { familia: 'volumen', factor: 1000 },
  unidad: { familia: 'conteo', factor: 1 },
  porcion: { familia: 'conteo', factor: 1 },
}

export const etiquetaUnidad = (unidad?: string | null): string =>
  UNIDADES.find((u) => u.value === unidad)?.label ?? unidad ?? ''

/**
 * Convierte `cantidad` de la unidad `desde` a la unidad `hasta`.
 * Si las unidades pertenecen a familias distintas devuelve la cantidad
 * original (no hay conversión posible sin densidad).
 */
export function convertir(cantidad: number, desde: Unidad, hasta: Unidad): number {
  const origen = BASE[desde]
  const destino = BASE[hasta]
  if (!origen || !destino || origen.familia !== destino.familia) return cantidad
  return (cantidad * origen.factor) / destino.factor
}
