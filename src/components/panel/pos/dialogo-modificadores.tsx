'use client'

import { Loader2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { moneda } from '@/lib/formato'
import {
  gruposDisponibles,
  maximoDe,
  minimoDe,
  seleccionInicial,
  type GrupoOpciones,
  type OpcionGrupo,
} from '@/lib/carta'
import type { Ajustes } from '@/lib/payload'
import { cn } from '@/lib/utils'

/** Los tipos viven en `@/lib/carta`; aquí se re-exportan por compatibilidad. */
export type OpcionModificador = OpcionGrupo
export type GrupoModificador = GrupoOpciones

export type ProductoPos = {
  id: string | number
  nombre: string
  descripcion?: string | null
  precio: number
  precioPromocional?: number | null
  disponible?: boolean | null
  estacion?: string | null
  categoria?: { id?: string | number; nombre?: string } | string | number | null
  gruposModificadores?: GrupoModificador[] | null
}

export type Linea = {
  uid: string
  producto: ProductoPos
  cantidad: number
  modificadores: Array<{ nombre: string; precioExtra: number }>
  notas: string
}

export const precioBase = (producto: ProductoPos) =>
  producto.precioPromocional ?? producto.precio ?? 0

export const precioLinea = (linea: Linea) =>
  precioBase(linea.producto) +
  linea.modificadores.reduce((suma, modificador) => suma + (modificador.precioExtra ?? 0), 0)

export function DialogoModificadores({
  producto,
  abierto,
  onOpenChange,
  ajustes,
  onAgregar,
}: {
  producto: ProductoPos | null
  abierto: boolean
  onOpenChange: (valor: boolean) => void
  ajustes: Ajustes
  onAgregar: (linea: Omit<Linea, 'uid'>) => void
}) {
  const grupos = gruposDisponibles(producto)

  const [seleccion, setSeleccion] = useState<Record<string, string[]>>({})
  const [cantidad, setCantidad] = useState(1)
  const [notas, setNotas] = useState('')
  const [error, setError] = useState<string | null>(null)

  const reiniciar = () => {
    setSeleccion(seleccionInicial(grupos))
    setCantidad(1)
    setNotas('')
    setError(null)
  }

  const alternar = (grupo: GrupoModificador, nombre: string) => {
    const clave = String(grupo.id ?? grupo.nombre)
    setSeleccion((actual) => {
      const elegidos = actual[clave] ?? []
      if (grupo.tipo === 'unica') return { ...actual, [clave]: [nombre] }

      const maximo = maximoDe(grupo)
      if (elegidos.includes(nombre)) {
        return { ...actual, [clave]: elegidos.filter((valor) => valor !== nombre) }
      }
      if (elegidos.length >= maximo) return actual
      return { ...actual, [clave]: [...elegidos, nombre] }
    })
  }

  const confirmar = () => {
    if (!producto) return

    for (const grupo of grupos) {
      const clave = String(grupo.id ?? grupo.nombre)
      const elegidos = seleccion[clave] ?? []
      const minimo = minimoDe(grupo)
      if (elegidos.length < minimo) {
        setError(`Elige al menos ${minimo} opción(es) en "${grupo.nombre}".`)
        return
      }
    }

    const modificadores = grupos.flatMap((grupo) =>
      (seleccion[String(grupo.id ?? grupo.nombre)] ?? []).map((nombre) => {
        const opcion = (grupo.opciones ?? []).find((candidata) => candidata.nombre === nombre)
        return { nombre, precioExtra: opcion?.precioExtra ?? 0 }
      }),
    )

    onAgregar({ producto, cantidad, modificadores, notas })
    onOpenChange(false)
  }

  const extras = grupos.flatMap((grupo) =>
    (seleccion[String(grupo.id ?? grupo.nombre)] ?? []).map(
      (nombre) =>
        (grupo.opciones ?? []).find((candidata) => candidata.nombre === nombre)?.precioExtra ?? 0,
    ),
  )
  const totalLinea = producto
    ? (precioBase(producto) + extras.reduce((suma, extra) => suma + extra, 0)) * cantidad
    : 0

  return (
    <Dialog
      open={abierto}
      onOpenChange={(valor) => {
        if (valor) reiniciar()
        onOpenChange(valor)
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{producto?.nombre}</DialogTitle>
          {producto?.descripcion && <DialogDescription>{producto.descripcion}</DialogDescription>}
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {grupos.map((grupo) => {
            const clave = String(grupo.id ?? grupo.nombre)
            const elegidos = seleccion[clave] ?? []

            return (
              <div key={clave} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">
                    {grupo.nombre}
                    {grupo.obligatorio && <span className="ml-1 text-destructive">*</span>}
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {grupo.tipo === 'unica' ? 'Elige una' : `Hasta ${grupo.maxSelecciones ?? '∞'}`}
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {(grupo.opciones ?? []).map((opcion) => {
                    const activa = elegidos.includes(opcion.nombre)
                    return (
                      <label
                        key={opcion.nombre}
                        className={cn(
                          'flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                          activa ? 'border-primary bg-primary/10' : 'hover:bg-accent/40',
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <Checkbox
                            checked={activa}
                            onCheckedChange={() => alternar(grupo, opcion.nombre)}
                          />
                          {opcion.nombre}
                        </span>
                        {opcion.precioExtra > 0 && (
                          <span className="text-xs text-muted-foreground">
                            +{moneda(opcion.precioExtra, ajustes)}
                          </span>
                        )}
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}

          <div className="flex flex-col gap-2">
            <Label htmlFor="notas-linea" className="text-sm">
              Notas para cocina
            </Label>
            <Textarea
              id="notas-linea"
              rows={2}
              value={notas}
              onChange={(evento) => setNotas(evento.target.value)}
              placeholder="Sin cebolla, término medio, alergias…"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setCantidad((valor) => Math.max(1, valor - 1))}
            >
              −
            </Button>
            <span className="w-8 text-center font-medium">{cantidad}</span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setCantidad((valor) => Math.min(30, valor + 1))}
            >
              +
            </Button>
          </div>
          <Button type="button" onClick={confirmar}>
            Agregar · {moneda(totalLinea, ajustes)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function IconoCargando() {
  return <Loader2 className="size-4 animate-spin" />
}
