'use client'

import { Loader2, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { eliminarRegistro } from '@/actions/crud'
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

export function BotonEliminar({
  recurso,
  id,
  nombre,
}: {
  recurso: string
  id: string
  nombre: string
}) {
  const [pendiente, iniciar] = useTransition()
  const [abierto, setAbierto] = useState(false)
  const router = useRouter()

  const eliminar = () => {
    iniciar(async () => {
      const resultado = await eliminarRegistro(recurso, id)
      if (resultado.error) {
        toast.error(resultado.error)
        return
      }
      toast.success(`"${nombre}" eliminado`)
      setAbierto(false)
      router.refresh()
    })
  }

  return (
    <AlertDialog open={abierto} onOpenChange={setAbierto}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Eliminar">
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar &quot;{nombre}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Si el registro tiene historial relacionado
            (pedidos, movimientos o reservaciones) el sistema impedirá borrarlo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(evento) => {
              evento.preventDefault()
              eliminar()
            }}
            disabled={pendiente}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {pendiente && <Loader2 className="size-4 animate-spin" />}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
