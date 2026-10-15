'use client'

/**
 * Interruptor rápido de disponibilidad de un platillo.
 * Llama a la server action propia de carta (no a `alternarCampo`, porque
 * `productos` no está declarada en el registro de recursos).
 */

import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { toast } from 'sonner'

import { alternarDisponible } from '@/actions/carta'
import { Button } from '@/components/ui/button'

export function BotonDisponible({
  id,
  nombre,
  disponible,
}: {
  id: string | number
  nombre: string
  disponible: boolean
}) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()

  const alternar = () => {
    iniciar(async () => {
      const resultado = await alternarDisponible(String(id), !disponible)
      if (resultado.error) {
        toast.error(resultado.error)
        return
      }
      toast.success(resultado.mensaje ?? 'Disponibilidad actualizada.')
      router.refresh()
    })
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={alternar}
      disabled={pendiente}
      aria-label={disponible ? `Pausar ${nombre}` : `Activar ${nombre}`}
      title={disponible ? 'Marcar como no disponible' : 'Marcar como disponible'}
    >
      {pendiente ? (
        <Loader2 className="size-4 animate-spin" />
      ) : disponible ? (
        <Eye className="size-4" />
      ) : (
        <EyeOff className="size-4 text-muted-foreground" />
      )}
    </Button>
  )
}
