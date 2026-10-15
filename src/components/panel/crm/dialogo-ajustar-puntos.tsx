'use client'

import { Loader2, SlidersHorizontal } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { ajustarPuntos } from '@/actions/crm'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { numero } from '@/lib/formato'

/** Diálogo para sumar o restar puntos manualmente, dejando el motivo en notas. */
export function DialogoAjustarPuntos({
  clienteId,
  clienteNombre,
  puntos,
}: {
  clienteId: string
  clienteNombre: string
  puntos: number
}) {
  const [abierto, setAbierto] = useState(false)
  const [delta, setDelta] = useState('')
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pendiente, iniciar] = useTransition()
  const router = useRouter()

  const ajuste = Number(delta)
  const valido = Number.isFinite(ajuste) && ajuste !== 0 && motivo.trim().length > 0
  const saldo = Number.isFinite(ajuste) ? puntos + Math.round(ajuste) : puntos

  const cerrar = () => {
    setAbierto(false)
    setError(null)
    setDelta('')
    setMotivo('')
  }

  const confirmar = () => {
    if (!valido) {
      setError('Indica una cantidad distinta de cero y el motivo del ajuste.')
      return
    }
    setError(null)

    iniciar(async () => {
      const resultado = await ajustarPuntos(clienteId, Number(delta), motivo)
      if (resultado.error) {
        setError(resultado.error)
        toast.error(resultado.error)
        return
      }
      toast.success(resultado.mensaje ?? 'Puntos ajustados')
      cerrar()
      router.refresh()
    })
  }

  return (
    <Dialog
      open={abierto}
      onOpenChange={(valor) => {
        if (valor) setAbierto(true)
        else cerrar()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <SlidersHorizontal className="size-4" />
          Ajustar puntos
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar puntos</DialogTitle>
          <DialogDescription>
            Saldo actual de {clienteNombre}: <strong>{numero(puntos)} puntos</strong>. Usa un
            número negativo para restar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="delta-puntos">Puntos a sumar o restar</Label>
            <Input
              id="delta-puntos"
              type="number"
              step={1}
              placeholder="Ej. 100 o -50"
              value={delta}
              onChange={(evento) => setDelta(evento.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {[50, 100, 250, -50].map((sugerido) => (
                <Button
                  key={sugerido}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setDelta(String(sugerido))}
                >
                  {sugerido > 0 ? `+${sugerido}` : sugerido}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="motivo-puntos">Motivo</Label>
            <Textarea
              id="motivo-puntos"
              rows={2}
              placeholder="Ej. Compensación por pedido tardío, cortesía, corrección de captura…"
              value={motivo}
              onChange={(evento) => setMotivo(evento.target.value)}
            />
          </div>

          {Number.isFinite(ajuste) && ajuste !== 0 && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3 text-sm">
              <span className="text-muted-foreground">Saldo después del ajuste</span>
              <span className={saldo < 0 ? 'font-medium text-destructive' : 'font-medium'}>
                {numero(saldo)} puntos
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={cerrar}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={pendiente || !valido}>
            {pendiente && <Loader2 className="size-4 animate-spin" />}
            Guardar ajuste
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
