'use client'

/**
 * Editor de las opciones de un grupo (tallas, extras, términos).
 *
 * Cada fila define una opción, su precio extra, si viene marcada por defecto y
 * si hoy está disponible. Se serializa a un input oculto llamado `opciones`
 * para que viaje junto con el resto del formulario de grupos.
 */

import { Plus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { moneda } from '@/lib/formato'
import type { Ajustes } from '@/lib/payload'
import { cn } from '@/lib/utils'

export type OpcionInicial = {
  nombre?: string | null
  precioExtra?: number | null
  porDefecto?: boolean | null
  disponible?: boolean | null
}

type Fila = {
  clave: string
  nombre: string
  precioExtra: string
  porDefecto: boolean
  disponible: boolean
}

export function EditorOpciones({
  inicial = [],
  ajustes,
  tipo = 'unica',
}: {
  inicial?: OpcionInicial[]
  ajustes?: Ajustes | null
  tipo?: 'unica' | 'multiple'
}) {
  const contador = useRef(0)
  const nuevaClave = () => `opcion-${contador.current++}`

  const [filas, setFilas] = useState<Fila[]>(() =>
    (Array.isArray(inicial) ? inicial : []).map((opcion, indice) => ({
      clave: `inicial-${indice}`,
      nombre: opcion?.nombre ?? '',
      precioExtra:
        opcion?.precioExtra === null || opcion?.precioExtra === undefined
          ? ''
          : String(opcion.precioExtra),
      porDefecto: Boolean(opcion?.porDefecto),
      disponible: opcion?.disponible !== false,
    })),
  )

  const actualizar = (clave: string, cambios: Partial<Fila>) =>
    setFilas((actuales) =>
      actuales.map((fila) => (fila.clave === clave ? { ...fila, ...cambios } : fila)),
    )

  /**
   * En un grupo de selección única sólo puede haber una opción por defecto:
   * marcar una desmarca el resto.
   */
  const alternarDefecto = (clave: string) =>
    setFilas((actuales) =>
      actuales.map((fila) => {
        if (fila.clave === clave) return { ...fila, porDefecto: !fila.porDefecto }
        if (tipo === 'unica' && fila.porDefecto) return { ...fila, porDefecto: false }
        return fila
      }),
    )

  const agregar = () =>
    setFilas((actuales) => [
      ...actuales,
      { clave: nuevaClave(), nombre: '', precioExtra: '', porDefecto: false, disponible: true },
    ])

  const quitar = (clave: string) =>
    setFilas((actuales) => actuales.filter((fila) => fila.clave !== clave))

  const precios = filas
    .map((fila) => Number(fila.precioExtra) || 0)
    .filter((precio) => Number.isFinite(precio))

  const masBarata = precios.length > 0 ? Math.min(...precios) : 0
  const masCara = precios.length > 0 ? Math.max(...precios) : 0

  const serializadas = filas
    .filter((fila) => fila.nombre.trim() !== '')
    .map((fila) => ({
      nombre: fila.nombre.trim(),
      precioExtra: Number(fila.precioExtra) > 0 ? Number(fila.precioExtra) : 0,
      porDefecto: fila.porDefecto,
      disponible: fila.disponible,
    }))

  const sinDisponibles = serializadas.filter((opcion) => opcion.disponible).length

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="opciones" value={JSON.stringify(serializadas)} />

      <div className="hidden grid-cols-12 gap-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
        <span className="col-span-5">Opción</span>
        <span className="col-span-3">Precio extra</span>
        <span className="col-span-2 text-center">Por defecto</span>
        <span className="col-span-1 text-center">Disponible</span>
        <span className="col-span-1" />
      </div>

      {filas.length === 0 && (
        <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          Aún no hay opciones. Agrega la primera (por ejemplo, «Chica», «Mediana» y «Grande»).
        </p>
      )}

      {filas.map((fila) => (
        <div
          key={fila.clave}
          className={cn(
            'grid grid-cols-1 items-center gap-2 rounded-lg border bg-card p-2 md:grid-cols-12',
            !fila.disponible && 'opacity-70',
          )}
        >
          <div className="md:col-span-5">
            <Input
              value={fila.nombre}
              onChange={(evento) => actualizar(fila.clave, { nombre: evento.target.value })}
              placeholder="Nombre de la opción"
            />
          </div>

          <div className="md:col-span-3">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={fila.precioExtra}
              onChange={(evento) => actualizar(fila.clave, { precioExtra: evento.target.value })}
              placeholder="0.00"
            />
          </div>

          <div className="flex items-center gap-2 md:col-span-2 md:justify-center">
            <span className="text-xs text-muted-foreground md:hidden">Por defecto</span>
            <Checkbox
              checked={fila.porDefecto}
              onCheckedChange={() => alternarDefecto(fila.clave)}
              aria-label={`Marcar ${fila.nombre || 'la opción'} por defecto`}
            />
          </div>

          <div className="flex items-center gap-2 md:col-span-1 md:justify-center">
            <span className="text-xs text-muted-foreground md:hidden">Disponible</span>
            <Checkbox
              checked={fila.disponible}
              onCheckedChange={() => actualizar(fila.clave, { disponible: !fila.disponible })}
              aria-label={`${fila.nombre || 'La opción'} disponible hoy`}
            />
          </div>

          <div className="md:col-span-1 md:text-right">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Quitar opción"
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
          Agregar opción
        </Button>

        <div className="flex flex-wrap items-center gap-3">
          {tipo === 'unica' && serializadas.some((opcion) => opcion.porDefecto) && (
            <p className="text-xs text-muted-foreground">
              Sólo se aplicará una opción por defecto (el grupo es de selección única).
            </p>
          )}

          {serializadas.length > 0 && sinDisponibles === 0 && (
            <p className="text-xs text-destructive">
              Todas las opciones están agotadas: el grupo no se mostrará en la carta.
            </p>
          )}

          <div className="rounded-xl border bg-card px-4 py-2 text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Puede sumar al precio
            </p>
            <p className="text-sm font-semibold tabular-nums">
              {masBarata === masCara
                ? moneda(masCara, ajustes)
                : `${moneda(masBarata, ajustes)} – ${moneda(masCara, ajustes)}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
