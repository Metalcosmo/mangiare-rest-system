'use client'

/**
 * Editor de receta de un platillo.
 *
 * Cada fila define un ingrediente, la cantidad y la unidad. El costo se
 * calcula en vivo convirtiendo la unidad de la receta a la unidad del
 * inventario, y el resultado se serializa a un input oculto llamado `receta`
 * para que viaje junto con el resto del formulario.
 */

import { Plus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { moneda } from '@/lib/formato'
import type { Ajustes } from '@/lib/payload'
import { UNIDADES, convertir, type Unidad } from '@/lib/unidades'
import { cn } from '@/lib/utils'

/** Ingrediente disponible para armar la receta, con su costo de inventario. */
export type IngredienteReceta = {
  id: string | number
  nombre: string
  unidad: string
  costoUnitario: number
}

/** Línea de receta tal como llega desde Payload (relación poblada o id). */
export type LineaRecetaInicial = {
  ingrediente?: unknown
  cantidad?: number | null
  unidad?: string | null
  notas?: string | null
}

type Fila = {
  clave: string
  ingrediente: string
  cantidad: string
  unidad: string
  notas: string
}

const idDe = (valor: unknown): string => {
  if (valor === null || valor === undefined) return ''
  if (typeof valor === 'object') return String((valor as { id?: unknown }).id ?? '')
  return String(valor)
}

export function EditorReceta({
  ingredientes,
  inicial = [],
  ajustes,
}: {
  ingredientes: IngredienteReceta[]
  inicial?: LineaRecetaInicial[]
  ajustes?: Ajustes | null
}) {
  const contador = useRef(0)
  const nuevaClave = () => `fila-${contador.current++}`

  const [filas, setFilas] = useState<Fila[]>(() =>
    (Array.isArray(inicial) ? inicial : []).map((linea, indice) => ({
      clave: `inicial-${indice}`,
      ingrediente: idDe(linea?.ingrediente),
      cantidad:
        linea?.cantidad === null || linea?.cantidad === undefined ? '' : String(linea.cantidad),
      unidad: linea?.unidad ?? '',
      notas: linea?.notas ?? '',
    })),
  )

  const porId = new Map(ingredientes.map((ingrediente) => [String(ingrediente.id), ingrediente]))

  const actualizar = (clave: string, cambios: Partial<Fila>) =>
    setFilas((actuales) =>
      actuales.map((fila) => (fila.clave === clave ? { ...fila, ...cambios } : fila)),
    )

  const cambiarIngrediente = (clave: string, valor: string) => {
    const ingrediente = porId.get(valor)
    actualizar(clave, { ingrediente: valor, unidad: ingrediente?.unidad ?? '' })
  }

  const agregar = () =>
    setFilas((actuales) => [
      ...actuales,
      { clave: nuevaClave(), ingrediente: '', cantidad: '', unidad: '', notas: '' },
    ])

  const quitar = (clave: string) =>
    setFilas((actuales) => actuales.filter((fila) => fila.clave !== clave))

  const costoDe = (fila: Fila): number => {
    const ingrediente = porId.get(fila.ingrediente)
    const cantidad = Number(fila.cantidad)
    if (!ingrediente || !fila.cantidad.trim() || Number.isNaN(cantidad)) return 0

    const unidadDestino = (ingrediente.unidad || 'unidad') as Unidad
    const unidadOrigen = (fila.unidad || unidadDestino) as Unidad
    return convertir(cantidad, unidadOrigen, unidadDestino) * (ingrediente.costoUnitario ?? 0)
  }

  const total = filas.reduce((suma, fila) => suma + costoDe(fila), 0)

  const serializadas = filas
    .filter(
      (fila) =>
        fila.ingrediente &&
        fila.cantidad.trim() !== '' &&
        !Number.isNaN(Number(fila.cantidad)),
    )
    .map((fila) => ({
      ingrediente: fila.ingrediente,
      cantidad: Number(fila.cantidad),
      unidad: fila.unidad || porId.get(fila.ingrediente)?.unidad || 'unidad',
      ...(fila.notas.trim() ? { notas: fila.notas.trim() } : {}),
    }))

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="receta" value={JSON.stringify(serializadas)} />

      <div className="hidden grid-cols-12 gap-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
        <span className="col-span-4">Ingrediente</span>
        <span className="col-span-2">Cantidad</span>
        <span className="col-span-2">Unidad</span>
        <span className="col-span-2">Notas</span>
        <span className="col-span-1 text-right">Costo</span>
        <span className="col-span-1" />
      </div>

      {filas.length === 0 && (
        <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          Aún no hay ingredientes en la receta. Agrega el primero para calcular el costo.
        </p>
      )}

      {filas.map((fila) => (
        <div
          key={fila.clave}
          className="grid grid-cols-1 items-start gap-2 rounded-lg border bg-card p-2 md:grid-cols-12"
        >
          <div className="md:col-span-4">
            <Select value={fila.ingrediente || undefined} onValueChange={(v) => cambiarIngrediente(fila.clave, v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un ingrediente" />
              </SelectTrigger>
              <SelectContent>
                {ingredientes.map((ingrediente) => (
                  <SelectItem key={String(ingrediente.id)} value={String(ingrediente.id)}>
                    {ingrediente.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={fila.cantidad}
              onChange={(evento) => actualizar(fila.clave, { cantidad: evento.target.value })}
              placeholder="0"
            />
          </div>

          <div className="md:col-span-2">
            <Select value={fila.unidad || undefined} onValueChange={(v) => actualizar(fila.clave, { unidad: v })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Unidad" />
              </SelectTrigger>
              <SelectContent>
                {UNIDADES.map((unidad) => (
                  <SelectItem key={unidad.value} value={unidad.value}>
                    {unidad.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Input
              value={fila.notas}
              onChange={(evento) => actualizar(fila.clave, { notas: evento.target.value })}
              placeholder="Notas (opcional)"
            />
          </div>

          <div className="flex items-center justify-between gap-2 md:col-span-1 md:justify-end">
            <span className="text-xs text-muted-foreground md:hidden">Costo</span>
            <span className="text-sm font-medium tabular-nums">{moneda(costoDe(fila), ajustes)}</span>
          </div>

          <div className="md:col-span-1 md:text-right">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Quitar ingrediente"
              onClick={() => quitar(fila.clave)}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" onClick={agregar}>
          <Plus className="size-4" />
          Agregar ingrediente
        </Button>

        <div
          className={cn(
            'rounded-xl border bg-card px-4 py-2 text-right',
            total > 0 && 'border-primary/30',
          )}
        >
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Costo de la receta</p>
          <p className="text-lg font-semibold tabular-nums">{moneda(total, ajustes)}</p>
        </div>
      </div>
    </div>
  )
}
