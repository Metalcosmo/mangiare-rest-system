'use client'

import { Check, LayoutGrid, RotateCcw, Search, Table2 } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type MesaFiltro = { id: string; nombre: string; zona: string }
export type ZonaFiltro = { id: string; nombre: string }

/** Vistas rápidas de la lista de mesas. */
const VISTAS = [
  { valor: 'todas', etiqueta: 'Todas' },
  { valor: 'mis', etiqueta: 'Mis mesas' },
  { valor: 'confirmar', etiqueta: 'Por confirmar' },
  { valor: 'seleccion', etiqueta: 'Mi selección' },
  { valor: 'libres', etiqueta: 'Libres' },
  { valor: 'ocupadas', etiqueta: 'Ocupadas' },
] as const

const CLAVE_GUARDADA = 'mangiare:mesero:seleccion'

const leerGuardadas = (): string[] => {
  try {
    const crudo = window.localStorage.getItem(CLAVE_GUARDADA)
    return crudo ? crudo.split(',').filter(Boolean) : []
  } catch {
    return []
  }
}

/**
 * Filtros de la vista del mesero. Todo el estado vive en la URL (`vista`,
 * `zona`, `mesas`, `q`) para que sobreviva al refresco y se pueda compartir;
 * la selección de mesas además se recuerda en el navegador por comodidad.
 */
export function FiltroVistas({
  zonas,
  mesas,
}: {
  zonas: ZonaFiltro[]
  mesas: MesaFiltro[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const parametros = useSearchParams()

  const [guardadas, setGuardadas] = useState<string[]>([])

  useEffect(() => {
    setGuardadas(leerGuardadas())
  }, [])

  const actualizar = useCallback(
    (cambios: Record<string, string | null>) => {
      const nuevos = new URLSearchParams(parametros.toString())
      for (const [clave, valor] of Object.entries(cambios)) {
        if (valor) nuevos.set(clave, valor)
        else nuevos.delete(clave)
      }
      const cadena = nuevos.toString()
      router.replace(cadena ? `${pathname}?${cadena}` : pathname)
    },
    [parametros, pathname, router],
  )

  const vista = parametros.get('vista') ?? 'todas'
  const zona = parametros.get('zona') ?? 'todas'
  const busqueda = parametros.get('q') ?? ''

  const elegidas = useMemo(
    () => (parametros.get('mesas') ?? '').split(',').filter(Boolean),
    [parametros],
  )

  const alternarMesa = (id: string) => {
    const siguiente = elegidas.includes(id)
      ? elegidas.filter((valor) => valor !== id)
      : [...elegidas, id]

    try {
      window.localStorage.setItem(CLAVE_GUARDADA, siguiente.join(','))
    } catch {
      // Sin localStorage la selección sigue viviendo en la URL.
    }
    setGuardadas(siguiente)

    actualizar({
      mesas: siguiente.join(',') || null,
      vista: siguiente.length > 0 ? 'seleccion' : 'todas',
    })
  }

  const mesasOrdenadas = useMemo(
    () => [...mesas].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [mesas],
  )

  return (
    <div className="mb-5 flex flex-col gap-3">
      <div className="no-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
        {VISTAS.map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            onClick={() =>
              actualizar({
                vista: opcion.valor === 'todas' ? null : opcion.valor,
                // Al salir de la selección limpiamos el subconjunto.
                mesas: opcion.valor === 'seleccion' ? parametros.get('mesas') : null,
              })
            }
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              vista === opcion.valor
                ? 'border-primary bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent',
            )}
          >
            {opcion.etiqueta}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={zona}
          onValueChange={(valor) => actualizar({ zona: valor === 'todas' ? null : valor })}
        >
          <SelectTrigger className="h-9 w-full sm:w-52">
            <span className="flex items-center gap-2 truncate">
              <LayoutGrid className="size-3.5 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="Todas las zonas" />
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las zonas</SelectItem>
            {zonas.map((opcion) => (
              <SelectItem key={opcion.id} value={opcion.id}>
                {opcion.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Table2 className="size-3.5" />
              Elegir mesas
              {elegidas.length > 0 && (
                <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                  {elegidas.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-0">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ver sólo estas mesas
              </span>
              {elegidas.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    setGuardadas([])
                    try {
                      window.localStorage.removeItem(CLAVE_GUARDADA)
                    } catch {
                      // Ignorado: la URL ya quedó limpia.
                    }
                    actualizar({ mesas: null, vista: null })
                  }}
                >
                  Limpiar
                </Button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto p-2">
              {mesasOrdenadas.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                  No hay mesas activas.
                </p>
              )}
              {mesasOrdenadas.map((mesa) => (
                <label
                  key={mesa.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent"
                >
                  <Checkbox
                    checked={elegidas.includes(mesa.id)}
                    onCheckedChange={() => alternarMesa(mesa.id)}
                  />
                  <span className="min-w-0 flex-1 truncate">{mesa.nombre}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{mesa.zona}</span>
                </label>
              ))}
            </div>
            {guardadas.length > 0 && elegidas.length === 0 && (
              <div className="border-t p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 text-xs"
                  onClick={() => actualizar({ mesas: guardadas.join(','), vista: 'seleccion' })}
                >
                  <RotateCcw className="size-3.5" />
                  Usar mi selección guardada ({guardadas.length})
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <div className="relative w-full sm:ml-auto sm:w-64">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            defaultValue={busqueda}
            placeholder="Buscar mesa…"
            className="h-9 pl-8"
            onKeyDown={(evento) => {
              if (evento.key === 'Enter') {
                actualizar({ q: (evento.target as HTMLInputElement).value || null })
              }
            }}
          />
        </div>
      </div>

      {vista === 'seleccion' && elegidas.length > 0 && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Check className="size-3.5 text-emerald-600" />
          Mostrando {elegidas.length} {elegidas.length === 1 ? 'mesa elegida' : 'mesas elegidas'}.
          La selección se guarda en este dispositivo.
        </p>
      )}
    </div>
  )
}
