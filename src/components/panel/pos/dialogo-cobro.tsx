'use client'

import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useActionState, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { cobrarCuenta, type EstadoPedidoAccion } from '@/actions/pedidos'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { moneda } from '@/lib/formato'
import type { Ajustes } from '@/lib/payload'

export type PagoLinea = {
  metodo: string
  monto: number
  referencia: string
}

const METODOS = [
  { label: 'Efectivo', value: 'efectivo' },
  { label: 'Tarjeta', value: 'tarjeta' },
  { label: 'Transferencia', value: 'transferencia' },
  { label: 'Puntos de lealtad', value: 'puntos' },
  { label: 'Cortesía', value: 'cortesia' },
]

const ESTADO_INICIAL: EstadoPedidoAccion = {}

const redondear = (valor: number) => Math.round((valor + Number.EPSILON) * 100) / 100

/**
 * Cobra un pedido suelto o la cuenta completa de una mesa.
 *
 * Cuando llega `mesaId`, el cobro es de la mesa entera: el servidor reparte lo
 * recibido entre todas sus rondas abiertas, para no obligar al cajero a cobrar
 * comanda por comanda.
 */
export function DialogoCobro({
  abierto,
  onOpenChange,
  pedidoId,
  folio,
  total,
  ajustes,
  onCobrado,
  mesaId,
}: {
  abierto: boolean
  onOpenChange: (valor: boolean) => void
  pedidoId?: string | null
  folio: string
  total: number
  ajustes: Ajustes
  onCobrado?: () => void
  mesaId?: string | null
}) {
  const [pagos, setPagos] = useState<PagoLinea[]>([
    { metodo: 'efectivo', monto: redondear(total), referencia: '' },
  ])
  const [propina, setPropina] = useState(0)

  const [estado, accion, pendiente] = useActionState(cobrarCuenta, ESTADO_INICIAL)

  useEffect(() => {
    setPagos([{ metodo: 'efectivo', monto: redondear(total), referencia: '' }])
    setPropina(0)
  }, [total, pedidoId, mesaId])

  // `useActionState` devuelve un objeto nuevo por cada envío. Comparar por
  // referencia garantiza una sola notificación por cobro: sin esto, el efecto
  // se vuelve a disparar cada vez que el componente se re-renderiza (por
  // ejemplo al refrescar los datos del servidor) y la notificación se repite
  // en bucle.
  const ultimoCobro = useRef<EstadoPedidoAccion | null>(null)

  useEffect(() => {
    if (!estado.ok) return
    if (ultimoCobro.current === estado) return
    ultimoCobro.current = estado

    toast.success('Cobro registrado')
    onOpenChange(false)
    onCobrado?.()
  }, [estado, onOpenChange, onCobrado])

  const cobrado = redondear(pagos.reduce((suma, pago) => suma + (Number(pago.monto) || 0), 0))
  const esperado = redondear(total + (Number(propina) || 0))
  const restante = redondear(esperado - cobrado)

  const actualizarPago = (indice: number, cambios: Partial<PagoLinea>) =>
    setPagos((actuales) =>
      actuales.map((pago, posicion) => (posicion === indice ? { ...pago, ...cambios } : pago)),
    )

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mesaId ? `Cobrar la cuenta de ${folio}` : `Cobrar pedido ${folio}`}</DialogTitle>
          <DialogDescription>
            Registra los métodos de pago. Al confirmar se marca como pagado
            {mesaId ? ' y se cierran todas las rondas de la mesa.' : '.'} Se suman los puntos de
            lealtad del cliente.
          </DialogDescription>
        </DialogHeader>

        <form action={accion} className="flex flex-col gap-4">
          <input type="hidden" name="tipo" value={mesaId ? 'mesa' : 'pedido'} />
          {mesaId ? (
            <input type="hidden" name="mesaId" value={mesaId} />
          ) : (
            <input type="hidden" name="pedidoId" value={pedidoId ?? ''} />
          )}
          <input type="hidden" name="pagos" value={JSON.stringify(pagos)} />
          <input type="hidden" name="propina" value={propina} />
          <input type="hidden" name="descuento" value={0} />

          {estado.error && (
            <Alert variant="destructive">
              <AlertDescription>{estado.error}</AlertDescription>
            </Alert>
          )}

          <div className="rounded-xl border bg-muted/40 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total del pedido</span>
              <span className="font-semibold">{moneda(total, ajustes)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Propina</span>
              <div className="flex gap-2">
                {(ajustes.propinasSugeridas ?? [{ valor: 10 }, { valor: 15 }]).slice(0, 3).map((sugerida) => {
                  const monto = redondear((total * (sugerida.valor ?? 0)) / 100)
                  return (
                    <Button
                      key={sugerida.valor}
                      type="button"
                      size="sm"
                      variant={propina === monto ? 'default' : 'outline'}
                      onClick={() => {
                        setPropina(monto)
                        setPagos((actuales) =>
                          actuales.map((pago, posicion) =>
                            posicion === 0 ? { ...pago, monto: redondear(total + monto) } : pago,
                          ),
                        )
                      }}
                    >
                      {sugerida.valor}%
                    </Button>
                  )
                })}
                <Button
                  type="button"
                  size="sm"
                  variant={propina === 0 ? 'default' : 'outline'}
                  onClick={() => {
                    setPropina(0)
                    setPagos((actuales) =>
                      actuales.map((pago, posicion) =>
                        posicion === 0 ? { ...pago, monto: redondear(total) } : pago,
                      ),
                    )
                  }}
                >
                  Sin propina
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Label>Métodos de pago</Label>
            {pagos.map((pago, indice) => (
              <div key={indice} className="flex items-end gap-2">
                <Select
                  value={pago.metodo}
                  onValueChange={(valor) => actualizarPago(indice, { metodo: valor })}
                >
                  <SelectTrigger className="w-[45%]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METODOS.map((metodo) => (
                      <SelectItem key={metodo.value} value={metodo.value}>
                        {metodo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={pago.monto}
                  onChange={(evento) =>
                    actualizarPago(indice, { monto: Number(evento.target.value) })
                  }
                  className="flex-1"
                />
                {pagos.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setPagos((actuales) => actuales.filter((_, p) => p !== indice))}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}

            {pagos.length < 4 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() =>
                  setPagos((actuales) => [
                    ...actuales,
                    { metodo: 'tarjeta', monto: Math.max(0, restante), referencia: '' },
                  ])
                }
              >
                <Plus className="size-4" />
                Dividir el pago
              </Button>
            )}
          </div>

          <Separator />

          <div className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total a cubrir</span>
              <span>{moneda(esperado, ajustes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Recibido</span>
              <span>{moneda(cobrado, ajustes)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>{restante > 0 ? 'Falta por cubrir' : 'Cambio'}</span>
              <span className={restante > 0 ? 'text-destructive' : 'text-emerald-600'}>
                {moneda(Math.abs(restante), ajustes)}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pendiente || (!pedidoId && !mesaId)}>
              {pendiente && <Loader2 className="size-4 animate-spin" />}
              Confirmar cobro
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
