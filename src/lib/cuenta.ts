import { redondear } from './inventario'

/**
 * Reparto de un cobro entre las rondas de una mesa.
 *
 * La cuenta es de la mesa, pero los pagos se guardan en cada pedido. El reparto
 * es proporcional al total de cada ronda y, dentro de la ronda, proporcional a
 * cada método de pago. El residuo del redondeo cae siempre en la **última
 * ronda** y en el **último método**, de modo que la suma de lo guardado sea
 * exactamente lo que se cobró, sin centavos perdidos.
 */

export type PagoEntrada = {
  metodo: string
  monto: number
  referencia?: string | null
}

export type RondaCobro = {
  id: string | number
  total: number
}

export type RepartoRonda = {
  pedidoId: string | number
  pagos: Array<{ metodo: string; monto: number; referencia: string | null }>
  propina: number
  descuento: number
}

export function distribuirPagos(
  rondas: RondaCobro[],
  pagos: PagoEntrada[],
  propina = 0,
  descuento = 0,
): RepartoRonda[] {
  if (rondas.length === 0) return []

  const ordenadas = [...rondas].sort((a, b) => Number(a.id) - Number(b.id))
  const totalCuenta = redondear(ordenadas.reduce((suma, ronda) => suma + (ronda.total ?? 0), 0))
  const totalPagado = redondear(pagos.reduce((suma, pago) => suma + (Number(pago.monto) || 0), 0))
  const propinaTotal = redondear(Number(propina) || 0)
  const descuentoTotal = redondear(Math.min(Number(descuento) || 0, totalCuenta))

  const reparto: RepartoRonda[] = []
  let entregado = 0
  let propinaEntregada = 0
  let descuentoEntregado = 0

  ordenadas.forEach((ronda, indice) => {
    const esUltima = indice === ordenadas.length - 1
    const parte = totalCuenta > 0 ? (ronda.total ?? 0) / totalCuenta : 1 / ordenadas.length

    // Cuánto de lo cobrado le toca a esta ronda.
    const objetivo = esUltima
      ? redondear(totalPagado - entregado)
      : redondear(totalPagado * parte)

    const repartoPropina = esUltima
      ? redondear(propinaTotal - propinaEntregada)
      : redondear(propinaTotal * parte)

    const repartoDescuento = esUltima
      ? redondear(descuentoTotal - descuentoEntregado)
      : redondear(descuentoTotal * parte)

    // Y dentro de la ronda, cuánto a cada método de pago.
    let asignado = 0
    const pagosRonda = pagos.map((pago, posicion) => {
      const esUltimoPago = posicion === pagos.length - 1
      const monto = esUltimoPago
        ? redondear(objetivo - asignado)
        : totalPagado > 0
          ? redondear((objetivo * (Number(pago.monto) || 0)) / totalPagado)
          : 0

      asignado = redondear(asignado + monto)

      return {
        metodo: pago.metodo,
        monto,
        referencia: pago.referencia ? String(pago.referencia).slice(0, 120) : null,
      }
    })

    entregado = redondear(entregado + objetivo)
    propinaEntregada = redondear(propinaEntregada + repartoPropina)
    descuentoEntregado = redondear(descuentoEntregado + repartoDescuento)

    reparto.push({
      pedidoId: ronda.id,
      pagos: pagosRonda,
      propina: repartoPropina,
      descuento: repartoDescuento,
    })
  })

  return reparto
}
