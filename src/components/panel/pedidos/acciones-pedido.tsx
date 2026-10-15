'use client'

import {
  Banknote,
  Check,
  ChefHat,
  Loader2,
  Printer,
  XCircle,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { cambiarEstadoPedido } from '@/actions/pedidos'
import { DialogoCobro } from '@/components/panel/pos/dialogo-cobro'
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
import { Input } from '@/components/ui/input'
import type { Ajustes } from '@/lib/payload'

const SIGUIENTE: Record<string, { estado: string; etiqueta: string; icono: typeof Check } | null> = {
  nuevo: { estado: 'en_preparacion', etiqueta: 'Aceptar en cocina', icono: ChefHat },
  en_preparacion: { estado: 'listo', etiqueta: 'Marcar listo', icono: Check },
  listo: { estado: 'servido', etiqueta: 'Marcar servido', icono: Check },
  servido: null,
  pagado: null,
  cancelado: null,
}

export function AccionesPedido({
  pedidoId,
  folio,
  estado,
  total,
  ajustes,
}: {
  pedidoId: string
  folio: string
  estado: string
  total: number
  ajustes: Ajustes
}) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [cobroAbierto, setCobroAbierto] = useState(false)

  // Identidad estable: si cambia en cada render, el efecto de `DialogoCobro`
  // se vuelve a ejecutar y repite la notificación del cobro.
  const refrescar = useCallback(() => router.refresh(), [router])

  const avanzar = (nuevoEstado: string, mensaje: string) =>
    iniciar(async () => {
      const resultado = await cambiarEstadoPedido(pedidoId, nuevoEstado)
      if (resultado.error) {
        toast.error(resultado.error)
        return
      }
      toast.success(mensaje)
      router.refresh()
    })

  const siguiente = SIGUIENTE[estado]
  const cerrado = estado === 'pagado' || estado === 'cancelado'

  return (
    <div className="flex flex-wrap items-center gap-2">
      {siguiente && (
        <Button
          size="sm"
          disabled={pendiente}
          onClick={() => avanzar(siguiente.estado, 'Estado actualizado')}
        >
          {pendiente ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <siguiente.icono className="size-4" />
          )}
          {siguiente.etiqueta}
        </Button>
      )}

      {!cerrado && (
        <Button size="sm" variant="outline" onClick={() => setCobroAbierto(true)}>
          <Banknote className="size-4" />
          Cobrar
        </Button>
      )}

      <Button size="sm" variant="outline" onClick={() => window.print()}>
        <Printer className="size-4" />
        Imprimir
      </Button>

      {!cerrado && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="ghost" className="text-destructive">
              <XCircle className="size-4" />
              Cancelar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cancelar el pedido {folio}?</AlertDialogTitle>
              <AlertDialogDescription>
                Se devolverán los ingredientes al inventario y se revertirán los puntos de lealtad
                si ya se habían otorgado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              id="motivo-cancelacion"
              placeholder="Motivo de la cancelación"
              className="my-2"
            />
            <AlertDialogFooter>
              <AlertDialogCancel>Volver</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={(evento) => {
                  evento.preventDefault()
                  const motivo = (
                    document.getElementById('motivo-cancelacion') as HTMLInputElement | null
                  )?.value
                  iniciar(async () => {
                    const resultado = await cambiarEstadoPedido(pedidoId, 'cancelado', {
                      motivoCancelacion: motivo,
                    })
                    if (resultado.error) {
                      toast.error(resultado.error)
                      return
                    }
                    toast.success('Pedido cancelado')
                    router.refresh()
                  })
                }}
              >
                Cancelar pedido
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <DialogoCobro
        abierto={cobroAbierto}
        onOpenChange={setCobroAbierto}
        pedidoId={pedidoId}
        folio={folio}
        total={total}
        ajustes={ajustes}
        onCobrado={refrescar}
      />
    </div>
  )
}
