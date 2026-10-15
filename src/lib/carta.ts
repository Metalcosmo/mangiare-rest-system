/**
 * Variaciones de un platillo (tallas, extras, término de cocción).
 *
 * Este módulo es neutral: lo usan tanto Server Components (la carta pública y
 * la revisión del mesero) como componentes cliente (el diálogo del POS), así
 * que no puede importar nada de servidor.
 *
 * Regla de oro: **el precio de una opción siempre sale del catálogo**, nunca
 * de lo que manda el navegador.
 */

import { claveDe } from './ids'

export type OpcionGrupo = {
  nombre: string
  precioExtra: number
  porDefecto?: boolean
  /** Si es `false`, la opción existe pero hoy no se puede elegir. */
  disponible?: boolean
}

export type GrupoOpciones = {
  id?: string | number
  nombre: string
  tipo: 'unica' | 'multiple' | string
  obligatorio?: boolean
  minSelecciones?: number | null
  maxSelecciones?: number | null
  opciones?: OpcionGrupo[] | null
}

export type ModificadorElegido = {
  nombre: string
  precioExtra: number
}

export type ProductoConOpciones = {
  id: string | number
  nombre?: string | null
  gruposModificadores?: unknown
}

/** Cuántas opciones admite un grupo. Los grupos únicos siempre admiten una. */
export const maximoDe = (grupo: GrupoOpciones): number =>
  grupo.tipo === 'unica' ? 1 : Math.max(0, grupo.maxSelecciones ?? 99)

/** Cuántas opciones exige un grupo. */
export const minimoDe = (grupo: GrupoOpciones): number =>
  grupo.obligatorio
    ? Math.max(1, grupo.minSelecciones ?? 1)
    : Math.max(0, grupo.minSelecciones ?? 0)

/** Clave estable de un grupo dentro del estado de selección. */
export const claveDeGrupo = (grupo: GrupoOpciones): string =>
  String(grupo.id ?? grupo.nombre)

/**
 * Normaliza los grupos de un platillo tal como los devuelve Payload (relación
 * poblada o arreglo suelto). Incluye las opciones no disponibles: quien decide
 * si se ocultan es `gruposDisponibles`.
 */
export function gruposDe(valor: unknown): GrupoOpciones[] {
  if (!Array.isArray(valor)) return []

  return (valor as Array<Record<string, unknown>>)
    .filter((grupo) => grupo && typeof grupo === 'object')
    .map((grupo) => ({
      id: grupo.id as string | number | undefined,
      nombre: String(grupo.nombre ?? ''),
      tipo: String(grupo.tipo ?? 'unica'),
      obligatorio: Boolean(grupo.obligatorio),
      minSelecciones: (grupo.minSelecciones as number | null) ?? 0,
      maxSelecciones: (grupo.maxSelecciones as number | null) ?? 1,
      opciones: Array.isArray(grupo.opciones)
        ? (grupo.opciones as Array<Record<string, unknown>>)
            .filter((opcion) => opcion && typeof opcion === 'object')
            .map((opcion) => ({
              nombre: String(opcion.nombre ?? ''),
              precioExtra: Number(opcion.precioExtra ?? 0) || 0,
              porDefecto: Boolean(opcion.porDefecto),
              disponible: opcion.disponible !== false,
            }))
        : [],
    }))
    .filter((grupo) => grupo.nombre !== '')
}

/**
 * Grupos que hoy se pueden mostrar: sin las opciones agotadas y sin los grupos
 * que se quedaron sin ninguna opción elegible.
 */
export function gruposDisponibles(producto: unknown): GrupoOpciones[] {
  const fuente = (producto as { gruposModificadores?: unknown } | null | undefined)
    ?.gruposModificadores

  return gruposDe(fuente)
    .map((grupo) => ({
      ...grupo,
      opciones: (grupo.opciones ?? []).filter((opcion) => opcion.disponible !== false),
    }))
    .filter((grupo) => (grupo.opciones ?? []).length > 0)
}

/** Cuántas opciones elegibles ofrece un platillo. Sirve para el badge «opciones». */
export const opcionesElegibles = (producto: unknown): number =>
  gruposDisponibles(producto).reduce((suma, grupo) => suma + (grupo.opciones ?? []).length, 0)

/**
 * Preselección al abrir el diálogo de opciones.
 *
 * Un grupo de selección única nunca puede arrancar con dos opciones marcadas:
 * se cobrarían las dos y se rompería la regla de elegir una sola.
 */
export function seleccionInicial(grupos: GrupoOpciones[]): Record<string, string[]> {
  const inicial: Record<string, string[]> = {}

  for (const grupo of grupos) {
    const porDefecto = (grupo.opciones ?? [])
      .filter((opcion) => opcion.porDefecto)
      .map((opcion) => opcion.nombre)

    inicial[claveDeGrupo(grupo)] = porDefecto.slice(0, maximoDe(grupo))
  }

  return inicial
}

/**
 * Toma los modificadores que envió el cliente y devuelve sólo los que existen
 * en el platillo, están disponibles y caben en su grupo — **con el precio del
 * catálogo**. Es la barrera que impide que un cliente ponga un extra a cero.
 */
export function resolverModificadores(
  producto: unknown,
  enviados: Array<{ nombre?: string | null; precioExtra?: number | null }> | null | undefined,
): ModificadorElegido[] {
  const lista = Array.isArray(enviados) ? enviados : []
  if (lista.length === 0) return []

  const grupos = gruposDisponibles(producto)
  if (grupos.length === 0) return []

  const resultado: ModificadorElegido[] = []
  const usados = new Map<string, number>()

  for (const enviado of lista) {
    const nombre = String(enviado?.nombre ?? '').trim()
    if (!nombre) continue
    if (resultado.some((modificador) => modificador.nombre === nombre)) continue

    const grupo = grupos.find((candidato) =>
      (candidato.opciones ?? []).some((opcion) => opcion.nombre === nombre),
    )
    if (!grupo) continue

    const clave = claveDeGrupo(grupo)
    const elegidos = usados.get(clave) ?? 0
    if (elegidos >= maximoDe(grupo)) continue

    const opcion = (grupo.opciones ?? []).find((candidata) => candidata.nombre === nombre)
    if (!opcion) continue

    usados.set(clave, elegidos + 1)
    resultado.push({ nombre, precioExtra: Number(opcion.precioExtra ?? 0) || 0 })
  }

  return resultado
}

type ItemConVariaciones = {
  producto?: unknown
  modificadores?: Array<{ nombre?: string | null }> | null
}

/**
 * Valida las variaciones de un pedido antes de crearlo. Devuelve el mensaje de
 * error, o `null` si todo está en orden.
 *
 * Vive en las acciones y no en el hook a propósito: la semilla y las escrituras
 * de sistema crean pedidos sin modificadores y no deben romperse.
 */
export function validarVariaciones(
  items: ItemConVariaciones[],
  productos: ProductoConOpciones[],
): string | null {
  const porId = new Map(productos.map((producto) => [String(producto.id), producto]))

  for (const item of items) {
    const producto = porId.get(claveDe(item.producto))
    if (!producto) continue

    const todos = gruposDe(producto.gruposModificadores)
    if (todos.length === 0) continue

    const nombreProducto = producto.nombre ?? 'el platillo'
    const enviados = (item.modificadores ?? [])
      .map((modificador) => String(modificador?.nombre ?? '').trim())
      .filter(Boolean)

    for (const nombre of enviados) {
      const grupo = todos.find((candidato) =>
        (candidato.opciones ?? []).some((opcion) => opcion.nombre === nombre),
      )

      if (!grupo) {
        return `La opción "${nombre}" no pertenece a ${nombreProducto}.`
      }

      const vigente = (grupo.opciones ?? []).some(
        (opcion) => opcion.nombre === nombre && opcion.disponible !== false,
      )
      if (!vigente) {
        return `La opción "${nombre}" ya no está disponible.`
      }
    }

    const disponibles = gruposDisponibles(producto)

    for (const grupo of disponibles) {
      const elegidos = enviados.filter((nombre) =>
        (grupo.opciones ?? []).some((opcion) => opcion.nombre === nombre),
      ).length

      const minimo = minimoDe(grupo)
      if (elegidos < minimo) {
        return `Elige ${minimo} opción(es) en "${grupo.nombre}" para ${nombreProducto}.`
      }

      const maximo = maximoDe(grupo)
      if (elegidos > maximo) {
        return `Elige como máximo ${maximo} opción(es) en "${grupo.nombre}".`
      }
    }
  }

  return null
}
