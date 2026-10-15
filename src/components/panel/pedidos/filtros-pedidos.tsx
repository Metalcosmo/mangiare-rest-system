'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const ESTADOS = [
  { valor: '', etiqueta: 'Todos' },
  { valor: 'por_confirmar', etiqueta: 'Por confirmar' },
  { valor: 'nuevo', etiqueta: 'Nuevos' },
  { valor: 'en_preparacion', etiqueta: 'En preparación' },
  { valor: 'listo', etiqueta: 'Listos' },
  { valor: 'servido', etiqueta: 'Servidos' },
  { valor: 'pagado', etiqueta: 'Pagados' },
  { valor: 'cancelado', etiqueta: 'Cancelados' },
]

const CANALES = [
  { valor: '', etiqueta: 'Todos los canales' },
  { valor: 'mesa', etiqueta: 'En mesa' },
  { valor: 'mostrador', etiqueta: 'Mostrador' },
  { valor: 'para_llevar', etiqueta: 'Para llevar' },
]

const RANGOS = [
  { valor: 'hoy', etiqueta: 'Hoy' },
  { valor: 'semana', etiqueta: '7 días' },
  { valor: 'mes', etiqueta: '30 días' },
]

export function FiltrosPedidos() {
  const router = useRouter()
  const pathname = usePathname()
  const parametros = useSearchParams()

  const actualizar = useCallback(
    (clave: string, valor: string) => {
      const nuevos = new URLSearchParams(parametros.toString())
      if (valor) nuevos.set(clave, valor)
      else nuevos.delete(clave)
      router.replace(`${pathname}?${nuevos.toString()}`)
    },
    [parametros, pathname, router],
  )

  const estado = parametros.get('estado') ?? ''
  const canal = parametros.get('canal') ?? ''
  const rango = parametros.get('rango') ?? 'hoy'
  const busqueda = parametros.get('q') ?? ''

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {RANGOS.map((opcion) => (
          <Button
            key={opcion.valor}
            size="sm"
            variant={rango === opcion.valor ? 'default' : 'outline'}
            onClick={() => actualizar('rango', opcion.valor)}
          >
            {opcion.etiqueta}
          </Button>
        ))}
        <span className="mx-1 hidden h-6 w-px bg-border sm:block" />
        {CANALES.map((opcion) => (
          <Button
            key={opcion.valor}
            size="sm"
            variant={canal === opcion.valor ? 'secondary' : 'ghost'}
            onClick={() => actualizar('canal', opcion.valor)}
          >
            {opcion.etiqueta}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {ESTADOS.map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            onClick={() => actualizar('estado', opcion.valor)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              estado === opcion.valor
                ? 'border-primary bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent',
            )}
          >
            {opcion.etiqueta}
          </button>
        ))}

        <Input
          defaultValue={busqueda}
          placeholder="Buscar folio o cliente…"
          className="h-9 w-full sm:ml-auto sm:w-64"
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') {
              actualizar('q', (evento.target as HTMLInputElement).value)
            }
          }}
        />
      </div>
    </div>
  )
}
