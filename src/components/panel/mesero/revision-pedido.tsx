'use client'

import { Check, Loader2, Minus, Plus, Search, Trash2, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { guardarRevisionPedido, rechazarPedido, type EstadoPedidoAccion } from '@/actions/pedidos'
import {
  DialogoModificadores,
  precioBase,
  precioLinea,
  type Linea,
  type ProductoPos,
} from '@/components/panel/pos/dialogo-modificadores'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { opcionesElegibles } from '@/lib/carta'
import { moneda } from '@/lib/formato'
import type { Ajustes } from '@/lib/payload'

const ESTADO_INICIAL: EstadoPedidoAccion = {}
const redondear = (valor: number) => Math.round((valor + Number.EPSILON) * 100) / 100

export type LineaInicial = {
  producto: ProductoPos
  cantidad: number
  modificadores: Array<{ nombre: string; precioExtra: number }>
  notas: string
}

export type PedidoEnRevision = {
  id: string
  folio: string
  mesa: string | null
  zona: string | null
  comensales: number
  clienteNombre: string | null
  /** Número de comanda dentro de la sesión de la mesa. */
  ronda: number | null
  horaTexto: string
  propina: number
  notas: string | null
}

/**
 * Revisión de un pedido de mesa antes de mandarlo a cocina. El mesero ajusta
 * cantidades y platillos; nada de esto toca el inventario hasta aprobar.
 */
export function RevisionPedido({
  pedido,
  iniciales,
  productos,
  ajustes,
}: {
  pedido: PedidoEnRevision
  iniciales: LineaInicial[]
  productos: ProductoPos[]
  ajustes: Ajustes
}) {
  const router = useRouter()

  const [lineas, setLineas] = useState<Linea[]>(() =>
    iniciales.map((linea, indice) => ({ ...linea, uid: `inicial-${indice}` })),
  )
  const [busqueda, setBusqueda] = useState('')
  const [productoOpciones, setProductoOpciones] = useState<ProductoPos | null>(null)
  const [rechazando, iniciarRechazo] = useTransition()

  const [estado, accion, pendiente] = useActionState(guardarRevisionPedido, ESTADO_INICIAL)

  useEffect(() => {
    if (!estado.ok) return
    toast.success(estado.mensaje ?? 'Listo')
    router.refresh()
  }, [estado, router])

  useEffect(() => {
    if (estado.error) toast.error(estado.error)
  }, [estado.error])

  const agregarLinea = (nueva: Omit<Linea, 'uid'>) => {
    setLineas((actuales) => {
      const firma = (linea: Omit<Linea, 'uid'>) =>
        `${linea.producto.id}|${linea.modificadores.map((m) => m.nombre).sort().join(',')}|${linea.notas}`

      const existente = actuales.findIndex((linea) => firma(linea) === firma(nueva))
      if (existente >= 0 && !nueva.notas) {
        return actuales.map((linea, posicion) =>
          posicion === existente ? { ...linea, cantidad: linea.cantidad + nueva.cantidad } : linea,
        )
      }
      return [...actuales, { ...nueva, uid: `nueva-${Date.now()}-${Math.random().toString(36).slice(2)}` }]
    })
  }

  const cambiarCantidad = (uid: string, delta: number) =>
    setLineas((actuales) =>
      actuales
        .map((linea) =>
          linea.uid === uid ? { ...linea, cantidad: linea.cantidad + delta } : linea,
        )
        .filter((linea) => linea.cantidad > 0),
    )

  const quitarLinea = (uid: string) =>
    setLineas((actuales) => actuales.filter((linea) => linea.uid !== uid))

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    if (!termino) return productos
    return productos.filter(
      (producto) =>
        producto.nombre.toLowerCase().includes(termino) ||
        (producto.descripcion ?? '').toLowerCase().includes(termino),
    )
  }, [productos, busqueda])

  const subtotal = redondear(
    lineas.reduce((suma, linea) => suma + precioLinea(linea) * linea.cantidad, 0),
  )
  const tasa = (ajustes.impuestoPorcentaje ?? 0) / 100
  const impuesto = redondear(
    ajustes.impuestoIncluido !== false
      ? tasa > 0
        ? subtotal - subtotal / (1 + tasa)
        : 0
      : subtotal * tasa,
  )
  const total = redondear(
    (ajustes.impuestoIncluido !== false ? subtotal : subtotal + impuesto) + pedido.propina,
  )

  const itemsJson = JSON.stringify(
    lineas.map((linea) => ({
      producto: linea.producto.id,
      cantidad: linea.cantidad,
      modificadores: linea.modificadores,
      notas: linea.notas || undefined,
    })),
  )

  const rechazar = (motivo: string) =>
    iniciarRechazo(async () => {
      const resultado = await rechazarPedido(pedido.id, motivo)
      if (resultado.error) {
        toast.error(resultado.error)
        router.refresh()
        return
      }
      toast.success('Pedido rechazado')
      router.push('/panel/mesero')
      router.refresh()
    })

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_400px]">
      {/* Catálogo para agregar platillos */}
      <div className="flex min-w-0 flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Agregar un platillo que el cliente pidió de palabra…"
            className="h-11 pl-9"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
          {filtrados.map((producto) => (
            <button
              key={String(producto.id)}
              type="button"
              onClick={() =>
                opcionesElegibles(producto) > 0
                  ? setProductoOpciones(producto)
                  : agregarLinea({ producto, cantidad: 1, modificadores: [], notas: '' })
              }
              className="flex min-h-[80px] flex-col justify-between rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-accent/40"
            >
              <span className="line-clamp-2 text-sm font-medium">{producto.nombre}</span>
              <span className="mt-2 text-sm font-semibold text-primary">
                {moneda(precioBase(producto), ajustes)}
              </span>
            </button>
          ))}

          {filtrados.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
              No hay platillos que coincidan con la búsqueda.
            </p>
          )}
        </div>
      </div>

      {/* Ticket del pedido del cliente */}
      <div>
        <Card className="sticky top-24">
          <CardContent className="p-4">
            <form action={accion} className="flex flex-col gap-4">
              <input type="hidden" name="pedidoId" value={pedido.id} />
              <input type="hidden" name="items" value={itemsJson} />

              <div className="rounded-lg border bg-muted/40 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Lo que pidió el cliente
                </p>
                <p className="mt-1 flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-medium">
                    {pedido.mesa ?? 'Sin mesa'}
                    {pedido.zona ? ` · ${pedido.zona}` : ''}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{pedido.horaTexto}</span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {pedido.folio}
                  {pedido.ronda ? ` · Ronda ${pedido.ronda}` : ''} · {pedido.comensales}{' '}
                  {pedido.comensales === 1 ? 'comensal' : 'comensales'}
                  {pedido.clienteNombre ? ` · Abierta por ${pedido.clienteNombre}` : ''}
                </p>
              </div>

              {pedido.notas && (
                <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  {pedido.notas}
                </p>
              )}

              <ScrollArea className="max-h-80">
                {lineas.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    El pedido se quedó sin platillos. Agrega al menos uno para confirmarlo.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2 pr-2">
                    {lineas.map((linea) => (
                      <div key={linea.uid} className="rounded-lg border p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{linea.producto.nombre}</p>
                            {linea.modificadores.length > 0 && (
                              <p className="truncate text-xs text-muted-foreground">
                                {linea.modificadores.map((m) => m.nombre).join(' · ')}
                              </p>
                            )}
                            {linea.notas && (
                              <p className="truncate text-xs italic text-muted-foreground">
                                {linea.notas}
                              </p>
                            )}
                          </div>
                          <span className="shrink-0 text-sm font-semibold">
                            {moneda(precioLinea(linea) * linea.cantidad, ajustes)}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="size-7"
                              onClick={() => cambiarCantidad(linea.uid, -1)}
                            >
                              <Minus className="size-3" />
                            </Button>
                            <span className="w-6 text-center text-sm">{linea.cantidad}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="size-7"
                              onClick={() => cambiarCantidad(linea.uid, 1)}
                            >
                              <Plus className="size-3" />
                            </Button>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => quitarLinea(linea.uid)}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <Separator />

              <div className="flex flex-col gap-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{moneda(subtotal, ajustes)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Impuesto {ajustes.impuestoIncluido !== false ? '(incluido)' : ''}
                  </span>
                  <span>{moneda(impuesto, ajustes)}</span>
                </div>
                {pedido.propina > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Propina del cliente</span>
                    <span>{moneda(pedido.propina, ajustes)}</span>
                  </div>
                )}
                <div className="mt-1 flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span>{moneda(total, ajustes)}</span>
                </div>
              </div>

              {estado.error && <p className="text-sm text-destructive">{estado.error}</p>}

              <div className="flex flex-col gap-2">
                <Button
                  type="submit"
                  name="accion"
                  value="aprobar"
                  disabled={pendiente || lineas.length === 0}
                >
                  {pendiente ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Aprobar y enviar a cocina
                </Button>

                <Button
                  type="submit"
                  name="accion"
                  value="guardar"
                  variant="outline"
                  disabled={pendiente || lineas.length === 0}
                >
                  Guardar sin enviar
                </Button>
              </div>
            </form>

            <div className="mt-3 border-t pt-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-destructive"
                    disabled={rechazando}
                  >
                    <XCircle className="size-4" />
                    Rechazar el pedido
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Rechazar el pedido {pedido.folio}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      No llegará a cocina y quedará cancelado. Los cambios que hiciste aquí no se
                      guardan.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Input
                    id="motivo-rechazo-revision"
                    placeholder="Motivo del rechazo"
                    className="my-2"
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel>Volver</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={(evento) => {
                        evento.preventDefault()
                        const motivo = (
                          document.getElementById('motivo-rechazo-revision') as HTMLInputElement | null
                        )?.value
                        if (!motivo?.trim()) {
                          toast.error('Escribe el motivo del rechazo.')
                          return
                        }
                        rechazar(motivo)
                      }}
                    >
                      Rechazar pedido
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>

      <DialogoModificadores
        producto={productoOpciones}
        abierto={Boolean(productoOpciones)}
        onOpenChange={(valor) => !valor && setProductoOpciones(null)}
        ajustes={ajustes}
        onAgregar={agregarLinea}
      />
    </div>
  )
}
