'use server'

import { revalidatePath } from 'next/cache'

import { otorgarPuntosDeLealtad } from '@/hooks/pedidos'
import { usuarioActual, type UsuarioPanel } from '@/lib/auth'
import { descartarBorradoresDeSesion } from '@/lib/borrador'
import { validarVariaciones } from '@/lib/carta'
import { distribuirPagos, type PagoEntrada } from '@/lib/cuenta'
import { idCrudo, idNumero } from '@/lib/ids'
import { abrirSesionDeMesero, sesionAbiertaDeMesa } from '@/lib/mesa-sesion'
import { getPayloadClient } from '@/lib/payload'
import { parsearItems } from '@/lib/pedidos'

export type EstadoPedidoAccion = {
  ok?: boolean
  error?: string
  mensaje?: string
  folio?: string
  pedidoId?: string | number
  /** El pedido quedó esperando la confirmación de un mesero. */
  pendienteAprobacion?: boolean
}

const CANALES = ['mesa', 'mostrador', 'para_llevar'] as const
type Canal = (typeof CANALES)[number]

/**
 * Roles que pueden revisar, aprobar o rechazar un pedido de mesa.
 * Cocina queda fuera a propósito: prepara, no autoriza la venta.
 */
const ROLES_REVISION = ['admin', 'gerente', 'cajero', 'mesero']
const puedeRevisar = (rol?: string | null): boolean => ROLES_REVISION.includes(rol ?? '')

/** Mensaje único cuando otro mesero ya atendió el pedido. */
const YA_ATENDIDO = 'Este pedido ya fue atendido por otro mesero.'

/**
 * Crea un pedido desde el punto de venta (personal autenticado).
 * El servidor toma los precios del catálogo: nunca se confía en el cliente.
 */
export async function crearPedido(
  _prev: EstadoPedidoAccion,
  formData: FormData,
): Promise<EstadoPedidoAccion> {
  const usuario = await usuarioActual()
  if (!usuario) return { error: 'Tu sesión expiró. Vuelve a entrar.' }

  const canal = String(formData.get('canal') ?? 'mesa') as Canal
  if (!CANALES.includes(canal)) return { error: 'Canal de venta inválido.' }

  const { items, error } = parsearItems(formData.get('items')?.toString() ?? null)
  if (error || !items) return { error }

  const mesaId = formData.get('mesa')?.toString() || null
  if (canal === 'mesa' && !mesaId) return { error: 'Selecciona la mesa del pedido.' }

  const payload = await getPayloadClient()

  // Las variaciones (talla, extras) se validan contra el catálogo antes de crear.
  const idsProductos = [...new Set(items.map((item) => item.producto))]
  const { docs: productosConOpciones } = await payload.find({
    collection: 'productos',
    where: { id: { in: idsProductos } },
    depth: 1,
    limit: 0,
    pagination: false,
    overrideAccess: true,
  })

  const variaciones = validarVariaciones(items, productosConOpciones as never)
  if (variaciones) return { error: variaciones }

  // En mesa, el pedido del personal se cuelga de la cuenta abierta de la mesa:
  // si nadie la abrió desde el QR, la abre el mesero (sin cédula).
  let sesionId: number | null = null
  let ronda: number | null = null

  if (canal === 'mesa' && mesaId) {
    const sesion =
      (await sesionAbiertaDeMesa(payload, mesaId)) ??
      (await abrirSesionDeMesero(payload, {
        mesa: mesaId,
        nombre: usuario.nombre ?? 'Mesero',
      })).sesion

    if (sesion) {
      sesionId = idNumero(sesion.id)
      const { totalDocs } = await payload.count({
        collection: 'pedidos',
        where: { sesion: { equals: sesionId } },
        overrideAccess: true,
      })
      ronda = totalDocs + 1
    }
  }

  try {
    const pedido = await payload.create({
      collection: 'pedidos',
      overrideAccess: false,
      user: usuario as never,
      data: {
        canal,
        estado: 'nuevo',
        mesa: canal === 'mesa' && mesaId ? idNumero(mesaId) : null,
        sesion: sesionId,
        ronda,
        comensales: Number(formData.get('comensales') ?? 1) || 1,
        mesero: idNumero(usuario.id),
        clienteNombre: formData.get('clienteNombre')?.toString() || null,
        clienteTelefono: formData.get('clienteTelefono')?.toString() || null,
        notas: formData.get('notas')?.toString() || null,
        descuento: Number(formData.get('descuento') ?? 0) || 0,
        propina: Number(formData.get('propina') ?? 0) || 0,
        horaRecogida: formData.get('horaRecogida')?.toString()
          ? new Date(String(formData.get('horaRecogida'))).toISOString()
          : null,
        horaEnvioCocina: new Date().toISOString(),
        items: items as never,
      },
    })

    revalidatePath('/panel/pedidos')
    revalidatePath('/panel/kds')
    revalidatePath('/panel/pos')

    return {
      ok: true,
      folio: (pedido as { folio?: string }).folio,
      pedidoId: (pedido as { id: string | number }).id,
      mensaje: 'Pedido enviado a cocina.',
    }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : 'No pudimos crear el pedido. Intenta de nuevo.',
    }
  }
}


const MARCAS_TIEMPO: Record<string, string> = {
  en_preparacion: 'horaEnvioCocina',
  listo: 'horaListo',
  servido: 'horaEntrega',
  pagado: 'horaCobro',
}

/** Cambia el estado de un pedido y registra la marca de tiempo correspondiente. */
export async function cambiarEstadoPedido(
  id: string | number,
  estado: string,
  extra: { motivoCancelacion?: string } = {},
): Promise<EstadoPedidoAccion> {
  const usuario = await usuarioActual()
  if (!usuario) return { error: 'Tu sesión expiró.' }

  const permitidos = ['nuevo', 'en_preparacion', 'listo', 'servido', 'pagado', 'cancelado']
  if (!permitidos.includes(estado)) return { error: 'Estado inválido.' }

  const payload = await getPayloadClient()

  try {
    // Un pedido que espera al mesero no puede saltar la compuerta: sólo se
    // permite cancelarlo desde aquí. Para lo demás existe `aprobarPedido`.
    const actual = (await payload.findByID({
      collection: 'pedidos',
      id: idNumero(id),
      depth: 0,
      overrideAccess: false,
      user: usuario as never,
    })) as { estado?: string } | null

    if (!actual) return { error: 'No encontramos ese pedido.' }
    if (actual.estado === 'por_confirmar' && estado !== 'cancelado') {
      return { error: 'Este pedido espera la confirmación de un mesero.' }
    }

    const data: Record<string, unknown> = { estado }
    const marca = MARCAS_TIEMPO[estado]
    if (marca) data[marca] = new Date().toISOString()
    if (estado === 'cancelado' && extra.motivoCancelacion) {
      data.motivoCancelacion = extra.motivoCancelacion
    }

    await payload.update({
      collection: 'pedidos',
      id: idNumero(id),
      data: data as never,
      overrideAccess: false,
      user: usuario as never,
    })
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'No pudimos actualizar el pedido.',
    }
  }

  revalidatePath('/panel/pedidos')
  revalidatePath(`/panel/pedidos/${id}`)
  revalidatePath('/panel/kds')
  revalidatePath('/panel/pos')
  revalidatePath('/panel/salon')

  return { ok: true, mensaje: 'Estado actualizado.' }
}

/** Marca un platillo concreto como preparando o listo desde el KDS. */
export async function cambiarEstadoItem(
  pedidoId: string | number,
  indice: number,
  estadoItem: 'pendiente' | 'preparando' | 'listo',
): Promise<EstadoPedidoAccion> {
  const usuario = await usuarioActual()
  if (!usuario) return { error: 'Tu sesión expiró.' }

  const payload = await getPayloadClient()

  try {
    const pedido = (await payload.findByID({
      collection: 'pedidos',
      id: idNumero(pedidoId),
      depth: 0,
      overrideAccess: false,
      user: usuario as never,
    })) as { items?: Array<Record<string, unknown>>; estado?: string } | null

    if (!pedido?.items?.[indice]) return { error: 'No encontramos esa línea del pedido.' }
    if (pedido.estado === 'por_confirmar') {
      return { error: 'Este pedido espera la confirmación de un mesero.' }
    }

    const items = pedido.items.map((item, posicion) =>
      posicion === indice ? { ...item, estadoItem } : item,
    )

    const todosListos = items.every((item) => item.estadoItem === 'listo')

    await payload.update({
      collection: 'pedidos',
      id: idNumero(pedidoId),
      data: {
        items: items as never,
        ...(todosListos && pedido.estado !== 'listo' && pedido.estado !== 'pagado'
          ? { estado: 'listo', horaListo: new Date().toISOString() }
          : {}),
      },
      overrideAccess: false,
      user: usuario as never,
    })
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'No pudimos actualizar el platillo.',
    }
  }

  revalidatePath('/panel/kds')
  revalidatePath('/panel/pedidos')

  return { ok: true }
}

/** Lee y acota los pagos que manda el diálogo de cobro. */
function leerPagos(formData: FormData): { pagos?: PagoEntrada[]; error?: string } {
  try {
    const crudo = JSON.parse(formData.get('pagos')?.toString() ?? '[]')
    if (!Array.isArray(crudo) || crudo.length === 0) {
      return { error: 'Registra al menos un método de pago.' }
    }

    return {
      pagos: (crudo as Array<Record<string, unknown>>).slice(0, 6).map((pago) => ({
        metodo: String(pago.metodo ?? 'efectivo'),
        monto: Number(pago.monto ?? 0) || 0,
        referencia: pago.referencia ? String(pago.referencia) : null,
      })),
    }
  } catch {
    return { error: 'No pudimos leer los pagos.' }
  }
}

function rutasDeCobro(pedidoId?: string | number): void {
  revalidatePath('/panel/pedidos')
  if (pedidoId !== undefined) revalidatePath(`/panel/pedidos/${pedidoId}`)
  revalidatePath('/panel/kds')
  revalidatePath('/panel/pos')
  revalidatePath('/panel/salon')
  revalidatePath('/panel/mesero')
  revalidatePath('/panel')
}

/**
 * Cobra una cuenta: un pedido suelto (mostrador, para llevar, histórico) o la
 * mesa entera. La cuenta es de la mesa, así que una mesa se cobra de una sola
 * vez aunque tenga varias rondas.
 */
export async function cobrarCuenta(
  _prev: EstadoPedidoAccion,
  formData: FormData,
): Promise<EstadoPedidoAccion> {
  const tipo = formData.get('tipo')?.toString() ?? 'pedido'
  return tipo === 'mesa' ? cobrarMesa(formData) : cobrarPedidoUnico(formData)
}

/** Cobra un pedido suelto. */
export async function cobrarPedidoUnico(formData: FormData): Promise<EstadoPedidoAccion> {
  const usuario = await usuarioActual()
  if (!usuario) return { error: 'Tu sesión expiró.' }

  const pedidoId = formData.get('pedidoId')?.toString()
  if (!pedidoId) return { error: 'Falta el pedido a cobrar.' }

  const { pagos, error } = leerPagos(formData)
  if (error || !pagos) return { error }

  const payload = await getPayloadClient()
  const ahora = new Date().toISOString()

  try {
    await payload.update({
      collection: 'pedidos',
      id: idNumero(pedidoId),
      data: {
        estado: 'pagado',
        horaCobro: ahora,
        descuento: Number(formData.get('descuento') ?? 0) || 0,
        propina: Number(formData.get('propina') ?? 0) || 0,
        pagos: pagos.map((pago) => ({
          metodo: pago.metodo,
          monto: pago.monto,
          propina: 0,
          referencia: pago.referencia ?? null,
          fecha: ahora,
        })) as never,
      },
      overrideAccess: false,
      user: usuario as never,
    })
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'No pudimos registrar el cobro.',
    }
  }

  rutasDeCobro(pedidoId)

  return { ok: true, mensaje: 'Cobro registrado.' }
}

/** Estados que forman la cuenta de una mesa. */
const ESTADOS_COBRABLES = ['nuevo', 'en_preparacion', 'listo', 'servido']

/** Cobra todas las rondas abiertas de una mesa de una sola vez. */
async function cobrarMesa(formData: FormData): Promise<EstadoPedidoAccion> {
  const usuario = await usuarioActual()
  if (!usuario) return { error: 'Tu sesión expiró.' }

  const mesaId = formData.get('mesaId')?.toString()
  if (!mesaId) return { error: 'Falta la mesa a cobrar.' }

  const { pagos, error } = leerPagos(formData)
  if (error || !pagos) return { error }

  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'pedidos',
    where: {
      mesa: { equals: idNumero(mesaId) },
      estado: { in: [...ESTADOS_COBRABLES, 'por_confirmar', 'borrador'] },
    },
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: false,
    user: usuario as never,
  })

  const pedidos = docs as unknown as Array<{
    id: string | number
    estado?: string | null
    total?: number | null
    cliente?: unknown
  }>

  if (pedidos.some((pedido) => pedido.estado === 'borrador')) {
    return {
      error: 'La mesa tiene platillos sin enviar. Descartalos o envíalos antes de cobrar.',
    }
  }

  if (pedidos.some((pedido) => pedido.estado === 'por_confirmar')) {
    return { error: 'Hay una ronda esperando tu confirmación.' }
  }

  const rondas = pedidos.filter((pedido) => ESTADOS_COBRABLES.includes(pedido.estado ?? ''))
  if (rondas.length === 0) return { error: 'Esta mesa no tiene una cuenta abierta.' }

  const propina = Number(formData.get('propina') ?? 0) || 0
  const descuento = Number(formData.get('descuento') ?? 0) || 0
  const ahora = new Date().toISOString()

  const reparto = distribuirPagos(
    rondas.map((ronda) => ({ id: ronda.id, total: ronda.total ?? 0 })),
    pagos,
    propina,
    descuento,
  )

  try {
    for (const parte of reparto) {
      await payload.update({
        collection: 'pedidos',
        id: idNumero(parte.pedidoId),
        data: {
          estado: 'pagado',
          horaCobro: ahora,
          descuento: parte.descuento,
          propina: parte.propina,
          pagos: parte.pagos.map((pago) => ({
            metodo: pago.metodo,
            monto: pago.monto,
            propina: 0,
            referencia: pago.referencia,
            fecha: ahora,
          })) as never,
        } as never,
        overrideAccess: false,
        user: usuario as never,
        // Los puntos se otorgan por cliente una sola vez, al final del cobro.
        context: { omitirPuntos: true },
      })
    }

    await cerrarSesionDeMesa(payload, idNumero(mesaId), usuario)
    await otorgarPuntosDeLaCuenta(payload, rondas)
  } catch (fallo) {
    return {
      error: fallo instanceof Error ? fallo.message : 'No pudimos registrar el cobro.',
    }
  }

  rutasDeCobro()

  return { ok: true, mensaje: 'Cobro registrado.' }
}

/** Cierra la sesión de la mesa cobrada, si sigue abierta. */
async function cerrarSesionDeMesa(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  mesaId: number,
  usuario: UsuarioPanel,
): Promise<void> {
  const { docs } = await payload.find({
    collection: 'sesiones-mesa',
    where: { mesa: { equals: mesaId }, estado: { equals: 'abierta' } },
    depth: 0,
    limit: 10,
    overrideAccess: true,
  })

  for (const sesion of docs) {
    await descartarBorradoresDeSesion(payload, sesion.id)

    await payload.update({
      collection: 'sesiones-mesa',
      id: idNumero(sesion.id),
      data: {
        estado: 'cerrada',
        cerradaEn: new Date().toISOString(),
        motivoCierre: 'cobrada',
        cerradaPor: idNumero(usuario.id),
      } as never,
      overrideAccess: true,
    })
  }
}

/** Un solo abono de puntos por cliente, sobre el total de la cuenta. */
async function otorgarPuntosDeLaCuenta(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  rondas: Array<{ id: string | number; total?: number | null; cliente?: unknown }>,
): Promise<void> {
  const porCliente = new Map<string, number>()

  for (const ronda of rondas) {
    const clienteId = idCrudo(ronda.cliente)
    if (clienteId === undefined) continue

    const clave = String(clienteId)
    porCliente.set(clave, (porCliente.get(clave) ?? 0) + (ronda.total ?? 0))
  }

  for (const [clienteId, total] of porCliente) {
    await otorgarPuntosDeLealtad(payload, { clienteId, total })
  }
}

/** Aplica un cupón al pedido y recalcula el descuento. */
export async function aplicarCupon(
  pedidoId: string | number,
  codigo: string,
): Promise<EstadoPedidoAccion & { descuento?: number }> {
  const usuario = await usuarioActual()
  if (!usuario) return { error: 'Tu sesión expiró.' }

  const payload = await getPayloadClient()
  const ahora = new Date()

  const { docs } = await payload.find({
    collection: 'cupones',
    where: { codigo: { equals: codigo.trim().toUpperCase() }, activo: { equals: true } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user: usuario as never,
  })

  const cupon = docs[0] as
    | {
        id: string | number
        tipo?: string
        valor?: number
        minimoCompra?: number
        usosMaximos?: number
        usosActuales?: number
        validoDesde?: string
        validoHasta?: string
      }
    | undefined

  if (!cupon) return { error: 'Ese cupón no existe o ya no está activo.' }

  if (cupon.validoDesde && new Date(cupon.validoDesde) > ahora) {
    return { error: 'Ese cupón todavía no es válido.' }
  }
  if (cupon.validoHasta && new Date(cupon.validoHasta) < ahora) {
    return { error: 'Ese cupón ya venció.' }
  }
  if (cupon.usosMaximos && (cupon.usosActuales ?? 0) >= cupon.usosMaximos) {
    return { error: 'Ese cupón alcanzó su límite de usos.' }
  }

  const pedido = (await payload.findByID({
    collection: 'pedidos',
    id: pedidoId,
    depth: 0,
    overrideAccess: false,
    user: usuario as never,
  })) as { subtotal?: number } | null

  const subtotal = pedido?.subtotal ?? 0
  if (cupon.minimoCompra && subtotal < cupon.minimoCompra) {
    return { error: `El cupón requiere una compra mínima de ${cupon.minimoCompra}.` }
  }

  const descuento =
    cupon.tipo === 'porcentaje'
      ? Math.round(subtotal * ((cupon.valor ?? 0) / 100) * 100) / 100
      : Math.min(subtotal, cupon.valor ?? 0)

  try {
    await payload.update({
      collection: 'pedidos',
      id: idNumero(pedidoId),
      data: { cupon: idNumero(cupon.id), descuento } as never,
      overrideAccess: false,
      user: usuario as never,
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No pudimos aplicar el cupón.' }
  }

  revalidatePath('/panel/pos')
  revalidatePath(`/panel/pedidos/${pedidoId}`)

  return { ok: true, descuento, mensaje: 'Cupón aplicado.' }
}

/** Cambia la mesa asignada a un pedido (mover de mesa). */
export async function moverPedidoDeMesa(
  pedidoId: string | number,
  mesaId: string | number | null,
): Promise<EstadoPedidoAccion> {
  const usuario = await usuarioActual()
  if (!usuario) return { error: 'Tu sesión expiró.' }

  const payload = await getPayloadClient()

  try {
    await payload.update({
      collection: 'pedidos',
      id: idNumero(pedidoId),
      data: {
        mesa: mesaId === null ? null : idNumero(mesaId),
        canal: mesaId ? 'mesa' : 'mostrador',
      } as never,
      overrideAccess: false,
      user: usuario as never,
    })
  } catch {
    return { error: 'No pudimos mover el pedido.' }
  }

  revalidatePath('/panel/salon')
  revalidatePath('/panel/pedidos')
  return { ok: true, mensaje: 'Pedido reubicado.' }
}

/** Rutas que hay que refrescar tras aprobar, rechazar o editar un pedido de mesa. */
function refrescarRevision(pedidoId: string | number): void {
  revalidatePath('/panel/mesero')
  revalidatePath(`/panel/mesero/${pedidoId}`)
  revalidatePath('/panel/pedidos')
  revalidatePath(`/panel/pedidos/${pedidoId}`)
  revalidatePath('/panel/kds')
  revalidatePath('/panel/salon')
  revalidatePath('/panel/pos')
}

/**
 * Carga un pedido y comprueba que siga esperando al mesero.
 * Devuelve el pedido, o el error que debe mostrarse.
 */
async function pedidoPorConfirmar(
  pedidoId: string | number,
  usuario: UsuarioPanel,
): Promise<{ pedido?: { id: string | number }; error?: string }> {
  const payload = await getPayloadClient()

  let pedido: { id: string | number; estado?: string } | null = null
  try {
    pedido = (await payload.findByID({
      collection: 'pedidos',
      id: idNumero(pedidoId),
      depth: 0,
      overrideAccess: false,
      user: usuario as never,
    })) as { id: string | number; estado?: string } | null
  } catch {
    return { error: 'No encontramos ese pedido.' }
  }

  if (!pedido) return { error: 'No encontramos ese pedido.' }
  if (pedido.estado !== 'por_confirmar') return { error: YA_ATENDIDO }

  return { pedido }
}

/**
 * Reemplaza los platillos de un pedido que todavía no ha sido aprobado.
 * Es seguro editar aquí porque el inventario aún no se ha descontado.
 *
 * El formulario manda `accion: 'aprobar'` cuando el mesero quiere guardar y
 * mandar el pedido a cocina en un solo paso, sin perder los ajustes.
 */
export async function guardarRevisionPedido(
  _prev: EstadoPedidoAccion,
  formData: FormData,
): Promise<EstadoPedidoAccion> {
  const usuario = await usuarioActual()
  if (!usuario) return { error: 'Tu sesión expiró.' }
  if (!puedeRevisar(usuario.rol)) return { error: 'Tu rol no puede revisar pedidos de mesa.' }

  const pedidoId = formData.get('pedidoId')?.toString()
  if (!pedidoId) return { error: 'Falta el pedido a revisar.' }

  const aprobar = formData.get('accion')?.toString() === 'aprobar'

  const { items, error } = parsearItems(formData.get('items')?.toString() ?? null)
  if (error || !items) return { error }

  const revision = await pedidoPorConfirmar(pedidoId, usuario)
  if (revision.error) return { error: revision.error }

  const payload = await getPayloadClient()

  try {
    await payload.update({
      collection: 'pedidos',
      id: idNumero(pedidoId),
      data: {
        items: items as never,
        ...(aprobar
          ? {
              estado: 'nuevo',
              horaEnvioCocina: new Date().toISOString(),
              mesero: idNumero(usuario.id),
            }
          : {}),
      } as never,
      overrideAccess: false,
      user: usuario as never,
    })
  } catch (fallo) {
    return {
      error: fallo instanceof Error ? fallo.message : 'No pudimos guardar los cambios.',
    }
  }

  refrescarRevision(pedidoId)

  return {
    ok: true,
    pedidoId,
    pendienteAprobacion: !aprobar,
    mensaje: aprobar ? 'Pedido confirmado y enviado a cocina.' : 'Cambios guardados.',
  }
}

/**
 * Aprueba un pedido de mesa: sale de `por_confirmar`, entra al KDS y recién
 * entonces el hook descuenta el inventario. El mesero queda como responsable.
 */
export async function aprobarPedido(pedidoId: string | number): Promise<EstadoPedidoAccion> {
  const usuario = await usuarioActual()
  if (!usuario) return { error: 'Tu sesión expiró.' }
  if (!puedeRevisar(usuario.rol)) return { error: 'Tu rol no puede confirmar pedidos de mesa.' }

  const revision = await pedidoPorConfirmar(pedidoId, usuario)
  if (revision.error) return { error: revision.error }

  const payload = await getPayloadClient()

  try {
    await payload.update({
      collection: 'pedidos',
      id: idNumero(pedidoId),
      data: {
        estado: 'nuevo',
        horaEnvioCocina: new Date().toISOString(),
        mesero: idNumero(usuario.id),
      } as never,
      overrideAccess: false,
      user: usuario as never,
    })
  } catch (fallo) {
    return {
      error: fallo instanceof Error ? fallo.message : 'No pudimos confirmar el pedido.',
    }
  }

  refrescarRevision(pedidoId)

  return { ok: true, pedidoId, mensaje: 'Pedido confirmado y enviado a cocina.' }
}

/** Rechaza un pedido de mesa que esperaba confirmación, con motivo obligatorio. */
export async function rechazarPedido(
  pedidoId: string | number,
  motivo: string,
): Promise<EstadoPedidoAccion> {
  const usuario = await usuarioActual()
  if (!usuario) return { error: 'Tu sesión expiró.' }
  if (!puedeRevisar(usuario.rol)) return { error: 'Tu rol no puede rechazar pedidos de mesa.' }

  const razon = motivo.trim()
  if (!razon) return { error: 'Escribe el motivo del rechazo.' }

  const revision = await pedidoPorConfirmar(pedidoId, usuario)
  if (revision.error) return { error: revision.error }

  const payload = await getPayloadClient()

  try {
    await payload.update({
      collection: 'pedidos',
      id: idNumero(pedidoId),
      data: { estado: 'cancelado', motivoCancelacion: razon.slice(0, 300) } as never,
      overrideAccess: false,
      user: usuario as never,
    })
  } catch (fallo) {
    return {
      error: fallo instanceof Error ? fallo.message : 'No pudimos rechazar el pedido.',
    }
  }

  refrescarRevision(pedidoId)

  return { ok: true, pedidoId, mensaje: 'Pedido rechazado.' }
}
