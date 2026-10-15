'use client'

import { Loader2, Pencil, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { guardarRegistro, type EstadoAccion } from '@/actions/crud'
import { CampoFormulario, type MapaOpciones } from '@/components/panel/campos'
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
import { obtenerRecurso } from '@/lib/recursos'

const ESTADO_INICIAL: EstadoAccion = {}

type Props = {
  recurso: string
  /** Si se pasa, el formulario edita; si no, crea. */
  id?: string | null
  valores?: Record<string, unknown>
  opciones: MapaOpciones
  etiqueta?: string
  variante?: 'nuevo' | 'editar'
  className?: string
}

export function DialogoRegistro({
  recurso,
  id = null,
  valores = {},
  opciones,
  etiqueta,
  variante = 'nuevo',
  className,
}: Props) {
  const definicion = obtenerRecurso(recurso)
  const [abierto, setAbierto] = useState(false)
  const router = useRouter()

  const [estado, accion, pendiente] = useActionState(
    (previo: EstadoAccion, formData: FormData) =>
      guardarRegistro(previo, recurso, id, formData),
    ESTADO_INICIAL,
  )

  useEffect(() => {
    if (!estado.ok) return
    setAbierto(false)
    toast.success(estado.mensaje ?? 'Guardado')
    router.refresh()
  }, [estado, router])

  if (!definicion) return null

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        {variante === 'editar' ? (
          <Button variant="ghost" size="icon" className={className} aria-label="Editar">
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button className={className} size={etiqueta ? 'default' : 'icon'}>
            <Plus className="size-4" />
            {etiqueta}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {id ? `Editar ${definicion.singular.toLowerCase()}` : `Nuevo ${definicion.singular.toLowerCase()}`}
          </DialogTitle>
          {definicion.descripcion && (
            <DialogDescription>{definicion.descripcion}</DialogDescription>
          )}
        </DialogHeader>

        <form action={accion} className="flex flex-col gap-5" key={id ?? 'nuevo'}>
          {estado.error && (
            <Alert variant="destructive">
              <AlertDescription>{estado.error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {definicion.campos
              .filter((campo) => (id ? campo.nombre !== 'password' : true))
              .map((campo) => (
                <CampoFormulario
                  key={campo.nombre}
                  campo={campo}
                  valor={valores[campo.nombre]}
                  opciones={opciones}
                />
              ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pendiente}>
              {pendiente && <Loader2 className="size-4 animate-spin" />}
              {id ? 'Guardar cambios' : `Crear ${definicion.singular.toLowerCase()}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
