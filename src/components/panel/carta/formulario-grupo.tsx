'use client'

/**
 * Formulario de un grupo de opciones (tallas, extras, término de cocción).
 *
 * Va aparte del CRUD declarativo de `@/lib/recursos` porque las opciones son un
 * arreglo de objetos y el formulario genérico sólo maneja campos planos. Sigue
 * el mismo patrón que el editor de platillos: campos simples + un editor propio
 * que serializa a un input oculto.
 */

import { ArrowLeft, Loader2, Save } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { guardarGrupo } from '@/actions/carta'
import type { EstadoAccion } from '@/actions/crud'
import { EditorOpciones, type OpcionInicial } from '@/components/panel/carta/editor-opciones'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Ajustes } from '@/lib/payload'

const ESTADO_INICIAL: EstadoAccion = {}

export type GrupoInicial = {
  nombre?: string | null
  descripcion?: string | null
  tipo?: string | null
  obligatorio?: boolean | null
  minSelecciones?: number | null
  maxSelecciones?: number | null
  opciones?: OpcionInicial[] | null
}

export function FormularioGrupo({
  id = null,
  inicial = {},
  ajustes,
}: {
  id?: string | null
  inicial?: GrupoInicial
  ajustes?: Ajustes | null
}) {
  const router = useRouter()

  const [tipo, setTipo] = useState<'unica' | 'multiple'>(
    inicial.tipo === 'multiple' ? 'multiple' : 'unica',
  )
  const [obligatorio, setObligatorio] = useState(Boolean(inicial.obligatorio))

  const [estado, accion, pendiente] = useActionState(
    (previo: EstadoAccion, formData: FormData) => guardarGrupo(previo, id, formData),
    ESTADO_INICIAL,
  )

  useEffect(() => {
    if (!estado.ok) return
    toast.success(estado.mensaje ?? 'Grupo guardado.')
    router.push('/panel/carta/grupos')
    router.refresh()
  }, [estado, router])

  const opcionesIniciales = Array.isArray(inicial.opciones) ? inicial.opciones : []
  const maximoInicial = inicial.maxSelecciones ?? Math.max(1, opcionesIniciales.length)

  return (
    <form action={accion} className="flex flex-col gap-5">
      {estado.error && (
        <Alert variant="destructive">
          <AlertDescription>{estado.error}</AlertDescription>
        </Alert>
      )}

      <Card className="rounded-xl border bg-card">
        <CardHeader>
          <CardTitle>Datos del grupo</CardTitle>
          <CardDescription>
            Un grupo se asigna a los platillos desde el editor de cada platillo.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="nombre">Nombre del grupo</Label>
            <Input
              id="nombre"
              name="nombre"
              defaultValue={inicial.nombre ?? ''}
              placeholder="Ej. Talla, Extras, Término de la carne"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="descripcion">Ayuda para el cliente</Label>
            <Textarea
              id="descripcion"
              name="descripcion"
              rows={2}
              defaultValue={inicial.descripcion ?? ''}
              placeholder="Ej. Elige el tamaño de tu pizza"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tipo">Tipo de selección</Label>
            <Select
              name="tipo"
              value={tipo}
              onValueChange={(valor) => setTipo(valor === 'multiple' ? 'multiple' : 'unica')}
            >
              <SelectTrigger id="tipo" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unica">Selección única (ej. talla)</SelectItem>
                <SelectItem value="multiple">Selección múltiple (ej. extras)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Obligatorio</Label>
            <label
              htmlFor="obligatorio"
              className="flex h-9 cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 text-sm transition-colors hover:bg-accent/40"
            >
              <Checkbox
                id="obligatorio"
                name="obligatorio"
                checked={obligatorio}
                onCheckedChange={(valor) => setObligatorio(valor === true)}
              />
              <span>El cliente debe elegir una opción</span>
            </label>
          </div>

          {tipo === 'multiple' ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="minSelecciones">Mínimo a elegir</Label>
                <Input
                  id="minSelecciones"
                  name="minSelecciones"
                  type="number"
                  min={0}
                  defaultValue={inicial.minSelecciones ?? 0}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="maxSelecciones">Máximo a elegir</Label>
                <Input
                  id="maxSelecciones"
                  name="maxSelecciones"
                  type="number"
                  min={1}
                  defaultValue={maximoInicial}
                />
              </div>
            </>
          ) : (
            <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground sm:col-span-2">
              Un grupo de selección única admite exactamente una opción por platillo.
              {obligatorio
                ? ' Como es obligatorio, el cliente no podrá agregar el platillo sin elegir.'
                : ' El cliente puede no elegir ninguna.'}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-xl border bg-card">
        <CardHeader>
          <CardTitle>Opciones</CardTitle>
          <CardDescription>
            El precio extra se suma al del platillo. Desmarca «Disponible» cuando algo se acabe:
            la opción deja de ofrecerse sin borrarla.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditorOpciones inicial={opcionesIniciales} ajustes={ajustes} tipo={tipo} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pendiente}>
          {pendiente ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {id ? 'Guardar cambios' : 'Crear grupo'}
        </Button>
        <Button asChild type="button" variant="outline">
          <Link href="/panel/carta/grupos">
            <ArrowLeft className="size-4" />
            Volver
          </Link>
        </Button>
      </div>
    </form>
  )
}
