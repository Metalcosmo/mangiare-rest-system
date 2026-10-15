'use server'

/**
 * Acciones del módulo de carta y menú.
 *
 * La colección `productos` no está declarada en `@/lib/recursos`, así que el
 * formulario y las acciones genéricas no aplican: aquí van las operaciones
 * propias del editor de platillos y del interruptor de disponibilidad.
 */

import { revalidatePath } from 'next/cache'

import type { EstadoAccion } from '@/actions/crud'
import { usuarioActual } from '@/lib/auth'
import { getPayloadClient } from '@/lib/payload'

/** Línea de receta tal como viaja en el JSON oculto del formulario. */
type LineaReceta = {
  ingrediente: string | number
  cantidad: number
  unidad: string
  notas?: string
}

const RUTA_CARTA = '/panel/carta'
const RUTA_GRUPOS = '/panel/carta/grupos'

/** Conserva el tipo numérico de las relaciones de SQLite/D1. */
const idCrudo = (valor: string): string | number =>
  /^\d+$/.test(valor) ? Number(valor) : valor

const texto = (formData: FormData, campo: string): string | null => {
  const bruto = formData.get(campo)
  if (bruto === null) return null
  const valor = String(bruto).trim()
  return valor === '' ? null : valor
}

const numero = (formData: FormData, campo: string): number | null => {
  const bruto = formData.get(campo)
  if (bruto === null || String(bruto).trim() === '') return null
  const valor = Number(bruto)
  return Number.isNaN(valor) ? null : valor
}

const booleano = (formData: FormData, campo: string): boolean => {
  const bruto = formData.get(campo)
  return bruto === 'on' || bruto === 'true'
}

const lista = (formData: FormData, campo: string): string[] =>
  formData.getAll(campo).map(String).filter(Boolean)

/**
 * Parsea el JSON de la receta de forma tolerante: cualquier fila inválida se
 * descarta en lugar de romper el guardado completo.
 */
function parsearReceta(bruto: FormDataEntryValue | null): LineaReceta[] {
  if (typeof bruto !== 'string' || bruto.trim() === '') return []

  try {
    const datos = JSON.parse(bruto)
    if (!Array.isArray(datos)) return []

    return datos.flatMap((linea): LineaReceta[] => {
      const ingrediente = linea?.ingrediente
      const cantidad = Number(linea?.cantidad)

      if (
        ingrediente === null ||
        ingrediente === undefined ||
        String(ingrediente).trim() === '' ||
        Number.isNaN(cantidad)
      ) {
        return []
      }

      const unidad = linea?.unidad ? String(linea.unidad) : 'unidad'
      const notas = linea?.notas ? String(linea.notas).trim() : ''

      return [
        {
          ingrediente: idCrudo(String(ingrediente)),
          cantidad,
          unidad,
          ...(notas ? { notas } : {}),
        },
      ]
    })
  } catch {
    return []
  }
}

/**
 * Crea o actualiza un platillo con su receta.
 * El costo de la receta lo recalcula el hook del servidor: no se envía.
 */
export async function guardarPlatillo(
  _prev: EstadoAccion,
  id: string | null,
  formData: FormData,
): Promise<EstadoAccion> {
  const usuario = await usuarioActual()
  if (!usuario) return { error: 'Tu sesión expiró. Vuelve a entrar.' }

  const nombre = texto(formData, 'nombre')
  if (!nombre) return { error: 'El nombre del platillo es obligatorio.' }

  const categoria = texto(formData, 'categoria')
  if (!categoria) return { error: 'Selecciona una categoría para el platillo.' }

  const precio = numero(formData, 'precio')
  if (precio === null) return { error: 'El precio de venta es obligatorio.' }

  const estacion = texto(formData, 'estacion') ?? 'cocina'

  const data: Record<string, unknown> = {
    nombre,
    descripcion: texto(formData, 'descripcion'),
    categoria: idCrudo(categoria),
    estacion,
    precio,
    precioPromocional: numero(formData, 'precioPromocional'),
    tiempoPreparacion: numero(formData, 'tiempoPreparacion') ?? 0,
    sku: texto(formData, 'sku'),
    disponible: booleano(formData, 'disponible'),
    destacado: booleano(formData, 'destacado'),
    etiquetas: lista(formData, 'etiquetas'),
    alergenos: lista(formData, 'alergenos'),
    gruposModificadores: lista(formData, 'gruposModificadores').map(idCrudo),
    controlaStock: booleano(formData, 'controlaStock'),
    rendimiento: numero(formData, 'rendimiento') ?? 1,
    receta: parsearReceta(formData.get('receta')),
  }

  const payload = await getPayloadClient()

  try {
    if (id) {
      await payload.update({
        collection: 'productos',
        id: idCrudo(id),
        data: data as never,
        overrideAccess: false,
        user: usuario as never,
      })
    } else {
      await payload.create({
        collection: 'productos',
        data: data as never,
        overrideAccess: false,
        user: usuario as never,
      })
    }
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : 'No pudimos guardar el platillo.'
    return { error: mensaje }
  }

  revalidatePath(RUTA_CARTA)
  if (id) revalidatePath(`${RUTA_CARTA}/platillos/${id}`)

  return { ok: true, mensaje: id ? 'Platillo actualizado.' : 'Platillo creado.' }
}

/**
 * Activa o desactiva la disponibilidad de un platillo sin abrir el editor.
 * No se reutiliza `alternarCampo` porque `productos` no está en `RECURSOS`.
 */
export async function alternarDisponible(id: string, valor: boolean): Promise<EstadoAccion> {
  const usuario = await usuarioActual()
  if (!usuario) return { error: 'Tu sesión expiró.' }

  const payload = await getPayloadClient()

  try {
    await payload.update({
      collection: 'productos',
      id: idCrudo(id),
      data: { disponible: valor } as never,
      overrideAccess: false,
      user: usuario as never,
    })
  } catch {
    return { error: 'No pudimos actualizar la disponibilidad.' }
  }

  revalidatePath(RUTA_CARTA)
  return {
    ok: true,
    mensaje: valor ? 'Platillo disponible de nuevo.' : 'Platillo pausado en la carta.',
  }
}

// ── Grupos de opciones (tallas, extras, término de cocción) ─────────────────

/** Opción tal como viaja en el JSON oculto del formulario de grupos. */
type OpcionGrupo = {
  nombre: string
  precioExtra: number
  porDefecto: boolean
  disponible: boolean
}

/**
 * Parsea el JSON de opciones de forma tolerante: las filas sin nombre o con
 * precio inválido se normalizan en lugar de romper el guardado completo.
 */
function parsearOpciones(bruto: FormDataEntryValue | null): OpcionGrupo[] {
  if (typeof bruto !== 'string' || bruto.trim() === '') return []

  try {
    const datos = JSON.parse(bruto)
    if (!Array.isArray(datos)) return []

    return datos.flatMap((opcion): OpcionGrupo[] => {
      const nombre = String(opcion?.nombre ?? '').trim()
      if (!nombre) return []

      const brutoPrecio = Number(opcion?.precioExtra ?? 0)
      const precioExtra = Number.isFinite(brutoPrecio) && brutoPrecio > 0 ? brutoPrecio : 0

      return [
        {
          nombre,
          precioExtra,
          porDefecto: Boolean(opcion?.porDefecto),
          disponible: opcion?.disponible !== false,
        },
      ]
    })
  } catch {
    return []
  }
}

/**
 * En un grupo de selección única sólo tiene sentido una opción por defecto:
 * con dos marcadas se cobrarían las dos.
 */
function soloUnDefecto(opciones: OpcionGrupo[]): OpcionGrupo[] {
  let visto = false

  return opciones.map((opcion) => {
    if (!opcion.porDefecto) return opcion
    if (visto) return { ...opcion, porDefecto: false }
    visto = true
    return opcion
  })
}

/**
 * Crea o actualiza un grupo de opciones con sus opciones.
 *
 * No se reutiliza `guardarRegistro` porque el CRUD declarativo de
 * `@/lib/recursos` no sabe expresar un arreglo de objetos como `opciones`.
 */
export async function guardarGrupo(
  _prev: EstadoAccion,
  id: string | null,
  formData: FormData,
): Promise<EstadoAccion> {
  const usuario = await usuarioActual()
  if (!usuario) return { error: 'Tu sesión expiró. Vuelve a entrar.' }

  const nombre = texto(formData, 'nombre')
  if (!nombre) return { error: 'El nombre del grupo es obligatorio.' }

  const tipo = texto(formData, 'tipo') === 'multiple' ? 'multiple' : 'unica'
  const opciones = parsearOpciones(formData.get('opciones'))
  if (opciones.length === 0) return { error: 'Agrega al menos una opción con nombre.' }

  const obligatorio = booleano(formData, 'obligatorio')

  // Coherencia automática: un grupo único admite exactamente una opción.
  const maximoPedido = tipo === 'unica' ? 1 : numero(formData, 'maxSelecciones') ?? opciones.length
  const maxSelecciones = Math.min(Math.max(1, maximoPedido), opciones.length)

  const minimoPedido =
    tipo === 'unica' ? (obligatorio ? 1 : 0) : Math.max(0, numero(formData, 'minSelecciones') ?? 0)
  const minSelecciones = Math.min(minimoPedido, maxSelecciones)

  const data: Record<string, unknown> = {
    nombre,
    descripcion: texto(formData, 'descripcion'),
    tipo,
    obligatorio,
    minSelecciones,
    maxSelecciones,
    opciones: tipo === 'unica' ? soloUnDefecto(opciones) : opciones,
  }

  const payload = await getPayloadClient()

  try {
    if (id) {
      await payload.update({
        collection: 'grupos-modificadores',
        id: idCrudo(id),
        data: data as never,
        overrideAccess: false,
        user: usuario as never,
      })
    } else {
      await payload.create({
        collection: 'grupos-modificadores',
        data: data as never,
        overrideAccess: false,
        user: usuario as never,
      })
    }
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'No pudimos guardar el grupo.'
    return { error: mensaje }
  }

  revalidatePath(RUTA_GRUPOS)
  revalidatePath(RUTA_CARTA)

  return { ok: true, mensaje: id ? 'Grupo actualizado.' : 'Grupo creado.' }
}

/** Borra un grupo de opciones, salvo que algún platillo lo esté usando. */
export async function eliminarGrupo(id: string): Promise<EstadoAccion> {
  const usuario = await usuarioActual()
  if (!usuario) return { error: 'Tu sesión expiró.' }

  const payload = await getPayloadClient()
  const idNumerico = idCrudo(id)

  const { docs: enUso } = await payload.find({
    collection: 'productos',
    where: { gruposModificadores: { in: [idNumerico] } },
    depth: 0,
    limit: 5,
    overrideAccess: true,
  })

  if (enUso.length > 0) {
    const nombres = enUso
      .map((producto) => producto.nombre)
      .filter(Boolean)
      .join(', ')
    return { error: `No se puede borrar: lo usan ${nombres}.` }
  }

  try {
    await payload.delete({
      collection: 'grupos-modificadores',
      id: idNumerico,
      overrideAccess: false,
      user: usuario as never,
    })
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : 'No pudimos borrar el grupo.'
    return { error: mensaje }
  }

  revalidatePath(RUTA_GRUPOS)
  revalidatePath(RUTA_CARTA)

  return { ok: true, mensaje: 'Grupo eliminado.' }
}
