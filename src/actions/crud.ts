'use server'

import { revalidatePath } from 'next/cache'

import { usuarioActual } from '@/lib/auth'
import { getPayloadClient } from '@/lib/payload'
import { SIN_VALOR, obtenerRecurso, type Campo } from '@/lib/recursos'

export type EstadoAccion = {
  ok?: boolean
  error?: string
  mensaje?: string
}

type ValorCampo = string | number | boolean | string[] | null

/**
 * Convierte el FormData del formulario genérico al formato de Payload.
 *
 * Devuelve `undefined` cuando el campo no viene en el formulario: así Payload
 * conserva el valor anterior en una edición y aplica su valor por defecto en
 * una creación. Una cadena vacía sí significa "vaciar el campo".
 */
function leerCampo(campo: Campo, formData: FormData): ValorCampo | undefined {
  const { nombre, tipo } = campo

  if (tipo === 'booleano') {
    const bruto = formData.get(nombre)
    if (bruto === null) return undefined
    return bruto === 'on' || bruto === 'true'
  }

  if (tipo === 'multiselect') {
    if (!formData.has(nombre)) return undefined
    return formData.getAll(nombre).map(String).filter(Boolean)
  }

  if (tipo === 'relacion' && campo.multiple) {
    if (!formData.has(nombre)) return undefined
    return formData.getAll(nombre).map(String).filter(Boolean)
  }

  if (!formData.has(nombre)) return undefined

  const bruto = formData.get(nombre)?.toString() ?? ''

  switch (tipo) {
    case 'numero': {
      if (bruto.trim() === '') return null
      const numero = Number(bruto)
      return Number.isNaN(numero) ? null : numero
    }

    case 'fecha': {
      if (bruto.trim() === '') return null
      const fecha = new Date(bruto)
      return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString()
    }

    case 'relacion':
    case 'select': {
      if (bruto === '' || bruto === SIN_VALOR) return null
      return bruto
    }

    default:
      return bruto.trim() === '' ? null : bruto.trim()
  }
}

/** Guarda (crea o actualiza) cualquier recurso declarado en `RECURSOS`. */
export async function guardarRegistro(
  _prev: EstadoAccion,
  recurso: string,
  id: string | null,
  formData: FormData,
): Promise<EstadoAccion> {
  const definicion = obtenerRecurso(recurso)
  if (!definicion) return { error: 'Recurso desconocido.' }

  const usuario = await usuarioActual()
  if (!usuario) return { error: 'Tu sesión expiró. Vuelve a entrar.' }

  const data: Record<string, unknown> = {}
  for (const campo of definicion.campos) {
    const valor = leerCampo(campo, formData)
    if (valor !== undefined) data[campo.nombre] = valor
  }

  for (const campo of definicion.campos) {
    if (campo.requerido && (data[campo.nombre] === null || data[campo.nombre] === undefined)) {
      return { error: `El campo "${campo.etiqueta}" es obligatorio.` }
    }
  }

  // Las colecciones con autenticación exigen contraseña al crear el registro.
  if (definicion.coleccion === 'users' && !id && !data.password) {
    return { error: 'La contraseña es obligatoria para crear un acceso.' }
  }

  const payload = await getPayloadClient()

  try {
    if (id) {
      await payload.update({
        collection: definicion.coleccion as never,
        id,
        data: data as never,
        overrideAccess: false,
        user: usuario as never,
      })
    } else {
      await payload.create({
        collection: definicion.coleccion as never,
        data: data as never,
        overrideAccess: false,
        user: usuario as never,
      })
    }
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : 'No pudimos guardar el registro.'
    return { error: mensaje }
  }

  revalidatePath(definicion.ruta)
  return { ok: true, mensaje: `${definicion.singular} guardado.` }
}

/** Elimina un registro del recurso indicado. */
export async function eliminarRegistro(recurso: string, id: string): Promise<EstadoAccion> {
  const definicion = obtenerRecurso(recurso)
  if (!definicion) return { error: 'Recurso desconocido.' }

  const usuario = await usuarioActual()
  if (!usuario) return { error: 'Tu sesión expiró.' }

  const payload = await getPayloadClient()

  try {
    await payload.delete({
      collection: definicion.coleccion as never,
      id,
      overrideAccess: false,
      user: usuario as never,
    })
  } catch (error) {
    const mensaje =
      error instanceof Error
        ? error.message
        : 'No se pudo eliminar. Puede tener registros relacionados.'
    return { error: mensaje }
  }

  revalidatePath(definicion.ruta)
  return { ok: true }
}

/** Activa o desactiva un campo booleano sin abrir el formulario. */
export async function alternarCampo(
  recurso: string,
  id: string,
  campo: string,
  valor: boolean,
): Promise<EstadoAccion> {
  const definicion = obtenerRecurso(recurso)
  if (!definicion) return { error: 'Recurso desconocido.' }
  if (!definicion.campos.some((c) => c.nombre === campo && c.tipo === 'booleano')) {
    return { error: 'Campo no permitido.' }
  }

  const usuario = await usuarioActual()
  if (!usuario) return { error: 'Tu sesión expiró.' }

  const payload = await getPayloadClient()

  try {
    await payload.update({
      collection: definicion.coleccion as never,
      id,
      data: { [campo]: valor } as never,
      overrideAccess: false,
      user: usuario as never,
    })
  } catch {
    return { error: 'No pudimos actualizar el registro.' }
  }

  revalidatePath(definicion.ruta)
  return { ok: true }
}

/** Actualiza un campo de relación (por ejemplo, cambiar la mesa de un pedido). */
export async function actualizarRelacion(
  coleccion: string,
  id: string,
  campo: string,
  valor: string | number | null,
  ruta: string,
): Promise<EstadoAccion> {
  const permitidas = [
    'pedidos',
    'mesas',
    'reservaciones',
    'mesas',
    'clientes',
    'productos',
  ]
  if (!permitidas.includes(coleccion)) return { error: 'Colección no permitida.' }

  const usuario = await usuarioActual()
  if (!usuario) return { error: 'Tu sesión expiró.' }

  const payload = await getPayloadClient()

  try {
    await payload.update({
      collection: coleccion as never,
      id,
      data: { [campo]: valor === null ? null : valor } as never,
      overrideAccess: false,
      user: usuario as never,
    })
  } catch {
    return { error: 'No pudimos actualizar el registro.' }
  }

  revalidatePath(ruta)
  return { ok: true }
}

