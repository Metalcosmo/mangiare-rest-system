'use server'

import { revalidatePath } from 'next/cache'

import { usuarioActual } from '@/lib/auth'
import { getPayloadClient } from '@/lib/payload'

export type EstadoAjustes = {
  ok?: boolean
  error?: string
  mensaje?: string
}

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']

const texto = (formData: FormData, campo: string): string | null => {
  const valor = formData.get(campo)?.toString().trim()
  return valor ? valor : null
}

const numero = (formData: FormData, campo: string): number => {
  const valor = Number(formData.get(campo) ?? 0)
  return Number.isFinite(valor) ? valor : 0
}

const booleano = (formData: FormData, campo: string): boolean =>
  formData.get(campo) === 'on' || formData.get(campo) === 'true'

/**
 * Guarda la configuración del restaurante.
 * Es la base del white-label: marca, colores, moneda, impuestos y lealtad.
 */
export async function guardarAjustes(
  _prev: EstadoAjustes,
  formData: FormData,
): Promise<EstadoAjustes> {
  const usuario = await usuarioActual()
  if (!usuario) return { error: 'Tu sesión expiró. Vuelve a entrar.' }

  const propinas = (texto(formData, 'propinasSugeridas') ?? '')
    .split(',')
    .map((valor) => Number(valor.trim()))
    .filter((valor) => Number.isFinite(valor) && valor >= 0 && valor <= 100)
    .slice(0, 6)
    .map((valor) => ({ valor }))

  const horarios = DIAS.map((dia) => ({
    dia,
    abre: texto(formData, `horario_${dia}_abre`) ?? '13:00',
    cierra: texto(formData, `horario_${dia}_cierra`) ?? '23:00',
    cerrado: booleano(formData, `horario_${dia}_cerrado`),
  }))

  const payload = await getPayloadClient()

  try {
    await payload.updateGlobal({
      slug: 'ajustes',
      overrideAccess: false,
      user: usuario as never,
      data: {
        nombreComercial: texto(formData, 'nombreComercial') ?? 'Mi restaurante',
        eslogan: texto(formData, 'eslogan'),
        colorPrimario: texto(formData, 'colorPrimario') ?? '#c2410c',
        colorSecundario: texto(formData, 'colorSecundario') ?? '#1c1917',
        telefono: texto(formData, 'telefono'),
        email: texto(formData, 'email'),
        direccion: texto(formData, 'direccion'),
        instagram: texto(formData, 'instagram'),

        moneda: texto(formData, 'moneda') ?? 'MXN',
        simboloMoneda: texto(formData, 'simboloMoneda') ?? '$',
        impuestoPorcentaje: numero(formData, 'impuestoPorcentaje'),
        impuestoIncluido: booleano(formData, 'impuestoIncluido'),
        servicioPorcentaje: numero(formData, 'servicioPorcentaje'),
        propinasSugeridas: propinas.length > 0 ? propinas : [{ valor: 10 }],
        puntosPorUnidad: numero(formData, 'puntosPorUnidad'),
        valorPunto: numero(formData, 'valorPunto'),
        tiempoEstimadoMinutos: numero(formData, 'tiempoEstimadoMinutos'),
        aforoMaximo: numero(formData, 'aforoMaximo'),
        aceptaPedidos: booleano(formData, 'aceptaPedidos'),

        mensajeBienvenida: texto(formData, 'mensajeBienvenida'),
        mensajePie: texto(formData, 'mensajePie'),
        notaServicio: texto(formData, 'notaServicio'),
        permitirPropinaCliente: booleano(formData, 'permitirPropinaCliente'),

        encabezadoTicket: texto(formData, 'encabezadoTicket'),
        pieTicket: texto(formData, 'pieTicket'),
        identificacionFiscal: texto(formData, 'identificacionFiscal'),

        horarios,
      } as never,
    })
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'No pudimos guardar los ajustes.',
    }
  }

  // La marca se usa en el panel y en la carta pública.
  revalidatePath('/panel', 'layout')
  revalidatePath('/panel/ajustes')
  revalidatePath('/')

  return { ok: true, mensaje: 'Ajustes guardados.' }
}
