'use client'

import { Gift, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { canjearRecompensa } from '@/actions/crm'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { numero } from '@/lib/formato'

export type RecompensaDisponible = {
  id: string
  nombre: string
  costoPuntos: number
}

/** Diálogo para canjear una recompensa activa con los puntos del cliente. */
export function DialogoCanjear({
  clienteId,
  clienteNombre,
  puntos,
  recompensas,
}: {
  clienteId: string
  clienteNombre: string
  puntos: number
  recompensas: RecompensaDisponible[]
}) {
  const [abierto, setAbierto] = useState(false)
  const [seleccion, setSeleccion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pendiente, iniciar] = useTransition()
  const router = useRouter()

  const elegida = recompensas.find((recompensa) => recompensa.id === seleccion)
  const insuficientes = elegida ? elegida.costoPuntos > puntos : false

  const confirmar = () => {
    if (!elegida) {
      setError('Elige una recompensa para canjear.')
      return
    }
    setError(null)

    iniciar(async () => {
      const resultado = await canjearRecompensa(clienteId, elegida.id)
      if (resultado.error) {
        setError(resultado.error)
        toast.error(resultado.error)
        return
      }
      toast.success(resultado.mensaje ?? 'Recompensa canjeada')
      setAbierto(false)
      setSeleccion('')
      router.refresh()
    })
  }

  return (
    <Dialog
      open={abierto}
      onOpenChange={(valor) => {
        setAbierto(valor)
        if (!valor) {
          setError(null)
          setSeleccion('')
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Gift className="size-4" />
          Canjear recompensa
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Canjear recompensa</DialogTitle>
          <DialogDescription>
            {clienteNombre} tiene <strong>{numero(puntos)} puntos</strong> disponibles.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {recompensas.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No hay recompensas activas en el catálogo. Activa una desde la pestaña
              «Lealtad» para poder canjearla.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="recompensa">Recompensa</Label>
              <Select value={seleccion} onValueChange={setSeleccion}>
                <SelectTrigger id="recompensa" className="w-full">
                  <SelectValue placeholder="Selecciona una recompensa" />
                </SelectTrigger>
                <SelectContent>
                  {recompensas.map((recompensa) => (
                    <SelectItem key={recompensa.id} value={recompensa.id}>
                      {recompensa.nombre} · {numero(recompensa.costoPuntos)} pts
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {elegida && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Costo</span>
                <span className="font-medium">{numero(elegida.costoPuntos)} puntos</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-muted-foreground">Saldo después del canje</span>
                <span className={insuficientes ? 'font-medium text-destructive' : 'font-medium'}>
                  {numero(puntos - elegida.costoPuntos)} puntos
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setAbierto(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={pendiente || !elegida || insuficientes}>
            {pendiente && <Loader2 className="size-4 animate-spin" />}
            Canjear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
