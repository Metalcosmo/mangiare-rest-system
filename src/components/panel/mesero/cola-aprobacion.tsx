'use client'

import { BellRing, Check, ChefHat, Loader2, PencilLine, Users, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { aprobarPedido, rechazarPedido } from '@/actions/pedidos'
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

export type LineaPorConfirmar = {
  nombre: string
  cantidad: number
  modificadores: string[]
  notas: string | null
}

export type PedidoPorConfirmar = {
  id: string
  folio: string
  mesa: string | null
  zona: string | null
  /** Nombre de quien abrió la mesa desde el QR. */
  anfitrion: string | null
  /** Número de comanda dentro de la sesión de la mesa. */
  ronda: number | null
  comensales: number
  clienteNombre: string | null
  horaTexto: string
  totalTexto: string
  notas: string | null
  items: LineaPorConfirmar[]
}

/**
 * Cola de pedidos que el cliente envió desde su mesa y todavía no llegan a
 * cocina. El mesero puede revisarlos, aprobarlos o rechazarlos.
 */
export function ColaAprobacion({ pedidos }: { pedidos: PedidoPorConfirmar[] }) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [ocupado, setOcupado] = useState<string | null>(null)

  const aprobar = (pedido: PedidoPorConfirmar) => {
    setOcupado(pedido.id)
    iniciar(async () => {
      const resultado = await aprobarPedido(pedido.id)
      setOcupado(null)
      if (resultado.error) {
        toast.error(resultado.error)
        // Otro mesero pudo haberlo atendido: recargamos para reflejarlo.
        router.refresh()
        return
      }
      toast.success(`Pedido ${pedido.folio} enviado a cocina`)
      router.refresh()
    })
  }

  const rechazar = (pedido: PedidoPorConfirmar, motivo: string) => {
    setOcupado(pedido.id)
    iniciar(async () => {
      const resultado = await rechazarPedido(pedido.id, motivo)
      setOcupado(null)
      if (resultado.error) {
        toast.error(resultado.error)
        router.refresh()
        return
      }
      toast.success(`Pedido ${pedido.folio} rechazado`)
      router.refresh()
    })
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
      {pedidos.map((pedido) => {
        const trabajando = pendiente && ocupado === pedido.id

        return (
          <Card
            key={pedido.id}
            data-testid="cola-pedido"
            className="border-amber-500/60 bg-amber-500/5"
          >
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold leading-tight">
                    <BellRing className="size-4 shrink-0 text-amber-600" />
                    {pedido.mesa ?? 'Sin mesa'}
                    {pedido.anfitrion ? ` · ${pedido.anfitrion}` : ''}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {pedido.folio}
                    {pedido.ronda ? ` · Ronda ${pedido.ronda}` : ''}
                    {pedido.zona ? ` · ${pedido.zona}` : ''} · {pedido.horaTexto}
                  </p>
                </div>
                <span className="shrink-0 font-semibold">{pedido.totalTexto}</span>
              </div>

              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Users className="size-3.5" />
                  {pedido.comensales} {pedido.comensales === 1 ? 'comensal' : 'comensales'}
                </span>
                {pedido.clienteNombre && <span>{pedido.clienteNombre}</span>}
              </p>

              {pedido.anfitrion && (
                <p className="rounded-lg bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
                  Mesa abierta por <span className="font-medium">{pedido.anfitrion}</span>
                </p>
              )}

              <ul className="flex flex-col gap-1.5 rounded-lg border bg-background/60 px-3 py-2">
                {pedido.items.map((linea, indice) => (
                  <li key={`${pedido.id}-${indice}`} className="text-sm">
                    <span className="font-medium">{linea.cantidad}×</span> {linea.nombre}
                    {linea.modificadores.length > 0 && (
                      <span className="block text-xs text-muted-foreground">
                        {linea.modificadores.join(' · ')}
                      </span>
                    )}
                    {linea.notas && (
                      <span className="block text-xs italic text-muted-foreground">
                        {linea.notas}
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              {pedido.notas && (
                <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  {pedido.notas}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  data-testid="cola-aprobar"
                  disabled={trabajando}
                  onClick={() => aprobar(pedido)}
                >
                  {trabajando ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Check className="size-3.5" />
                  )}
                  Aprobar
                </Button>

                <Button asChild size="sm" variant="outline" className="flex-1">
                  <Link href={`/panel/mesero/${pedido.id}`}>
                    <PencilLine className="size-3.5" />
                    Revisar
                  </Link>
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      disabled={trabajando}
                    >
                      <XCircle className="size-3.5" />
                      Rechazar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Rechazar el pedido {pedido.folio}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        El pedido no llegará a cocina y quedará cancelado. El cliente verá que no
                        fue aceptado.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Input
                      id={`motivo-${pedido.id}`}
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
                            document.getElementById(`motivo-${pedido.id}`) as HTMLInputElement | null
                          )?.value
                          if (!motivo?.trim()) {
                            toast.error('Escribe el motivo del rechazo.')
                            return
                          }
                          rechazar(pedido, motivo)
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
        )
      })}

      {pedidos.length === 0 && (
        <Card className="border-dashed lg:col-span-2 xl:col-span-3">
          <CardContent className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <ChefHat className="size-6" />
            </span>
            <p className="font-medium">No hay pedidos esperando confirmación</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Cuando un cliente ordene desde el código QR de su mesa, aparecerá aquí para que lo
              revises antes de que pase a cocina.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
