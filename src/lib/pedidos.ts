import { idCrudo } from './ids'
import { redondear } from './inventario'

export type Canal = 'mesa' | 'mostrador' | 'para_llevar'

export type EstadoPedido =
  | 'borrador'
  | 'por_confirmar'
  | 'nuevo'
  | 'en_preparacion'
  | 'listo'
  | 'servido'
  | 'pagado'
  | 'cancelado'

export type EstadoItem = 'pendiente' | 'preparando' | 'listo'

export const ETIQUETA_CANAL: Record<Canal, string> = {
  mesa: 'En mesa',
  mostrador: 'Mostrador',
  para_llevar: 'Para llevar',
}

export const ETIQUETA_ESTADO: Record<EstadoPedido, string> = {
  borrador: 'Borrador',
  por_confirmar: 'Por confirmar',
  nuevo: 'Nuevo',
  en_preparacion: 'En preparación',
  listo: 'Listo',
  servido: 'Servido',
  pagado: 'Pagado',
  cancelado: 'Cancelado',
}

export const PREFIJO_CANAL: Record<Canal, string> = {
  mesa: 'M',
  mostrador: 'C',
  para_llevar: 'L',
}

/**
 * Pedidos que siguen abiertos y mantienen la mesa ocupada.
 *
 * `borrador` queda fuera a propósito: es lo que la mesa está armando y todavía
 * no mandó al mesero, así que no es una cuenta ni aparece en cocina. Para saber
 * si una sesión puede cerrarse hay que usar `ESTADOS_QUE_MANTIENEN_LA_MESA`.
 */
export const ESTADOS_ACTIVOS: EstadoPedido[] = [
  'por_confirmar',
  'nuevo',
  'en_preparacion',
  'listo',
  'servido',
]

/** Estados que impiden cerrar una sesión de mesa: los activos más el borrador. */
export const ESTADOS_QUE_MANTIENEN_LA_MESA: EstadoPedido[] = [...ESTADOS_ACTIVOS, 'borrador']

/**
 * Estados en los que el pedido ya descontó inventario.
 *
 * `por_confirmar` queda fuera a propósito: un pedido que espera la aprobación
 * del mesero todavía no toca el almacén. Por eso las tres transiciones
 * (crear → por_confirmar, por_confirmar → nuevo, por_confirmar → cancelado)
 * tienen que ser exactamente complementarias.
 */
export const ESTADOS_CON_CONSUMO: EstadoPedido[] = [
  'nuevo',
  'en_preparacion',
  'listo',
  'servido',
  'pagado',
]

/** ¿Este estado ya consumió ingredientes? */
export const consumeInventario = (estado?: string | null): boolean =>
  ESTADOS_CON_CONSUMO.includes((estado ?? '') as EstadoPedido)

/** ¿Es el borrador que la mesa todavía no ha mandado al mesero? */
export const esBorrador = (estado?: string | null): boolean => estado === 'borrador'

/** Estados desde los que un mesero todavía puede aprobar o rechazar. */
export const estaPorConfirmar = (estado?: string | null): boolean => estado === 'por_confirmar'

export type LineaModificador = {
  nombre?: string | null
  precioExtra?: number | null
}

export type ItemCalculable = {
  producto?: unknown
  nombre?: string | null
  cantidad?: number | null
  precioUnitario?: number | null
  modificadores?: LineaModificador[] | null
  subtotal?: number | null
}

export type PedidoCalculable = {
  items?: ItemCalculable[] | null
  descuento?: number | null
  impuesto?: number | null
  propina?: number | null
  total?: number | null
}

/** Precio unitario incluyendo los extras elegidos por el cliente. */
export const precioConExtras = (item: ItemCalculable): number =>
  (item.precioUnitario ?? 0) +
  (item.modificadores ?? []).reduce((total, mod) => total + (mod?.precioExtra ?? 0), 0)

/**
 * Recalcula subtotales de las líneas y los totales del pedido.
 * Si `impuestoIncluido` es verdadero, el precio de la carta ya lleva el impuesto
 * y sólo se desglosa; si no, el impuesto se suma al total.
 */
export function calcularTotales(
  pedido: PedidoCalculable,
  opciones: { impuestoPorcentaje?: number | null; impuestoIncluido?: boolean | null } = {},
): { subtotal: number; descuento: number; impuesto: number; total: number } {
  const tasa = (opciones.impuestoPorcentaje ?? 0) / 100
  const incluye = opciones.impuestoIncluido !== false

  let subtotal = 0
  for (const item of pedido.items ?? []) {
    item.subtotal = redondear(precioConExtras(item) * (item.cantidad ?? 0))
    subtotal += item.subtotal
  }
  subtotal = redondear(subtotal)

  const descuento = redondear(Math.min(pedido.descuento ?? 0, subtotal))
  const base = redondear(subtotal - descuento)

  const impuesto = incluye
    ? redondear(tasa > 0 ? base - base / (1 + tasa) : 0)
    : redondear(base * tasa)

  const total = redondear(incluye ? base : base + impuesto + (pedido.propina ?? 0))

  pedido.items = pedido.items ?? []
  pedido.descuento = descuento
  pedido.impuesto = impuesto
  pedido.total = total

  return { subtotal, descuento, impuesto, total }
}

/**
 * Prefijo del folio de un canal, ej. `M-`.
 *
 * Los folios salen del **último folio del canal**, no del total de pedidos: si
 * se borrara un pedido, contar hacia atrás repetiría uno ya usado y la creación
 * fallaría por índice único.
 */
export const prefijoDeFolio = (canal: Canal): string => PREFIJO_CANAL[canal] ?? 'P'

/** Siguiente folio del canal a partir del último emitido, ej. `M-0042`. */
export const folioSiguiente = (prefijo: string, ultimo: string | null | undefined): string => {
  const numero = Number(String(ultimo ?? '').replace(`${prefijo}-`, '')) || 0
  return `${prefijo}-${String(numero + 1).padStart(4, '0')}`
}

// ── Líneas de un pedido ─────────────────────────────────────────────────────

/** Tope de líneas por pedido (y por borrador de mesa). */
export const MAX_LINEAS = 40
/** Tope de unidades por línea. */
export const MAX_POR_LINEA = 30
/** Tope de opciones (talla, extras…) por línea. */
export const MAX_OPCIONES = 20

export type ItemEntrada = {
  producto: string | number
  cantidad: number
  modificadores?: Array<{ nombre: string; precioExtra: number }>
  notas?: string
}

/** Normaliza y valida una línea suelta, venga del POS, del QR o del borrador. */
export function parsearItem(linea: unknown): { item?: ItemEntrada; error?: string } {
  const crudo = (linea ?? {}) as Record<string, unknown>

  const producto = idCrudo(crudo.producto)
  if (producto === undefined) return { error: 'Hay una línea sin platillo.' }

  const cantidad = Math.floor(Number(crudo.cantidad ?? 1))
  if (!Number.isFinite(cantidad) || cantidad < 1 || cantidad > MAX_POR_LINEA) {
    return { error: `La cantidad de cada platillo debe estar entre 1 y ${MAX_POR_LINEA}.` }
  }

  const modificadores = Array.isArray(crudo.modificadores)
    ? (crudo.modificadores as Array<Record<string, unknown>>)
        .slice(0, MAX_OPCIONES)
        .map((mod) => ({
          nombre: String(mod?.nombre ?? '').slice(0, 120) || 'Opción',
          precioExtra: Math.max(0, Number(mod?.precioExtra ?? 0)) || 0,
        }))
    : []

  return {
    item: {
      producto,
      cantidad,
      modificadores,
      notas: crudo.notas ? String(crudo.notas).slice(0, 300) : undefined,
    },
  }
}

/** Normaliza y valida una lista de líneas serializada en JSON. */
export function parsearItems(
  bruto: string | null,
  lineasPrevias = 0,
): { items?: ItemEntrada[]; error?: string } {
  if (!bruto) return { error: 'El pedido no tiene platillos.' }

  let crudo: unknown
  try {
    crudo = JSON.parse(bruto)
  } catch {
    return { error: 'No pudimos leer los platillos del pedido.' }
  }

  if (!Array.isArray(crudo) || crudo.length === 0) {
    return { error: 'Agrega al menos un platillo al pedido.' }
  }
  if (crudo.length + lineasPrevias > MAX_LINEAS) {
    return { error: `Un pedido no puede tener más de ${MAX_LINEAS} líneas.` }
  }

  const items: ItemEntrada[] = []

  for (const linea of crudo as unknown[]) {
    const { item, error } = parsearItem(linea)
    if (error || !item) return { error }
    items.push(item)
  }

  return { items }
}

/** Firma de una línea: dos líneas iguales se suman en lugar de duplicarse. */
export const firmaDeItem = (item: {
  producto?: unknown
  modificadores?: Array<{ nombre?: string | null }> | null
  notas?: string | null
}): string =>
  [
    String(idCrudo(item.producto) ?? ''),
    (item.modificadores ?? [])
      .map((mod) => mod?.nombre ?? '')
      .sort()
      .join(','),
    (item.notas ?? '').trim(),
  ].join('|')
