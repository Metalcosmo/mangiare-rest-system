'use client'

import {
  BellRing,
  ChefHat,
  Check,
  Clock,
  Flame,
  RefreshCw,
  ShoppingBag,
  Store,
  UtensilsCrossed,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { cambiarEstadoItem, cambiarEstadoPedido } from '@/actions/pedidos'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type ItemComanda = {
  indice: number
  nombre: string
  cantidad: number
  estacion: string
  estadoItem: string
  notas: string | null
  modificadores: string[]
}

type Comanda = {
  id: string
  folio: string
  canal: string
  estado: string
  comensales: number
  notas: string | null
  createdAt: string
  horaEnvioCocina: string | null
  mesa: { nombre: string } | null
  mesero: { nombre: string } | null
  items: ItemComanda[]
}

const ESTACIONES = [
  { valor: 'todas', etiqueta: 'Todas las estaciones' },
  { valor: 'cocina', etiqueta: 'Cocina' },
  { valor: 'parrilla', etiqueta: 'Parrilla' },
  { valor: 'barra', etiqueta: 'Barra' },
  { valor: 'postres', etiqueta: 'Postres' },
  { valor: 'mostrador', etiqueta: 'Mostrador' },
]

const COLUMNAS = [
  { estado: 'nuevo', titulo: 'Nuevos', acento: 'border-t-sky-500' },
  { estado: 'en_preparacion', titulo: 'En preparación', acento: 'border-t-amber-500' },
  { estado: 'listo', titulo: 'Listos para servir', acento: 'border-t-emerald-500' },
]

const ICONO_CANAL: Record<string, typeof Store> = {
  mesa: UtensilsCrossed,
  mostrador: Store,
  para_llevar: ShoppingBag,
}

const ETIQUETA_CANAL: Record<string, string> = {
  mesa: 'En mesa',
  mostrador: 'Mostrador',
  para_llevar: 'Para llevar',
}

const minutosDesde = (fecha: string | null) => {
  if (!fecha) return 0
  const inicio = new Date(fecha).getTime()
  if (Number.isNaN(inicio)) return 0
  return Math.max(0, Math.floor((Date.now() - inicio) / 60000))
}

const urgencia = (minutos: number) => {
  if (minutos >= 25) return { clase: 'bg-destructive/15 text-destructive', etiqueta: 'Urgente' }
  if (minutos >= 15) return { clase: 'bg-amber-500/15 text-amber-700 dark:text-amber-300', etiqueta: 'Atención' }
  return { clase: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', etiqueta: 'A tiempo' }
}

export function PantallaCocina({ comandas }: { comandas: Comanda[]; ajustes: unknown }) {
  const router = useRouter()
  const [estacion, setEstacion] = useState('todas')
  const [tick, setTick] = useState(0)
  const [pendiente, iniciar] = useTransition()

  // Refresco automático del tablero.
  useEffect(() => {
    const intervalo = setInterval(() => router.refresh(), 10000)
    return () => clearInterval(intervalo)
  }, [router])

  // Recalcula los temporizadores cada 30 segundos.
  useEffect(() => {
    const intervalo = setInterval(() => setTick((valor) => valor + 1), 30000)
    return () => clearInterval(intervalo)
  }, [])

  const visibles = useMemo(
    () =>
      comandas
        .map((comanda) => ({
          ...comanda,
          items:
            estacion === 'todas'
              ? comanda.items
              : comanda.items.filter((item) => item.estacion === estacion),
        }))
        .filter((comanda) => comanda.items.length > 0),
    [comandas, estacion],
  )

  const ejecutar = (accion: () => Promise<{ ok?: boolean; error?: string }>, mensaje: string) => {
    iniciar(async () => {
      const resultado = await accion()
      if (resultado?.error) {
        toast.error(resultado.error)
        return
      }
      toast.success(mensaje)
      router.refresh()
    })
  }

  const totales = {
    nuevos: visibles.filter((comanda) => comanda.estado === 'nuevo').length,
    preparando: visibles.filter((comanda) => comanda.estado === 'en_preparacion').length,
    listos: visibles.filter((comanda) => comanda.estado === 'listo').length,
  }

  void tick

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
            <ChefHat className="size-6 text-primary" />
            Pantalla de cocina
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada comanda muestra su tiempo transcurrido. Se actualiza sola cada 10 segundos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-1">
            <Clock className="size-3.5" />
            {totales.nuevos} nuevos
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Flame className="size-3.5" />
            {totales.preparando} en preparación
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <BellRing className="size-3.5" />
            {totales.listos} listos
          </Badge>
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.refresh()}
            disabled={pendiente}
            aria-label="Refrescar"
          >
            <RefreshCw className={cn('size-4', pendiente && 'animate-spin')} />
          </Button>
        </div>
      </div>

      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {ESTACIONES.map((opcion) => (
          <Button
            key={opcion.valor}
            size="sm"
            variant={estacion === opcion.valor ? 'default' : 'outline'}
            className="whitespace-nowrap"
            onClick={() => setEstacion(opcion.valor)}
          >
            {opcion.etiqueta}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNAS.map((columna) => {
          const tarjetas = visibles.filter((comanda) => comanda.estado === columna.estado)

          return (
            <div key={columna.estado} className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {columna.titulo}
                </h2>
                <Badge variant="secondary">{tarjetas.length}</Badge>
              </div>

              <div className="flex flex-col gap-3">
                {tarjetas.length === 0 && (
                  <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Sin comandas en esta columna.
                  </p>
                )}

                {tarjetas.map((comanda) => {
                  const IconoCanal = ICONO_CANAL[comanda.canal] ?? UtensilsCrossed
                  const minutos = minutosDesde(comanda.horaEnvioCocina ?? comanda.createdAt)
                  const tono = urgencia(minutos)

                  return (
                    <Card
                      key={comanda.id}
                      className={cn('overflow-hidden border-t-4', columna.acento)}
                    >
                      <CardContent className="flex flex-col gap-3 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold">{comanda.folio}</p>
                            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <IconoCanal className="size-3.5" />
                              {comanda.mesa?.nombre ?? ETIQUETA_CANAL[comanda.canal] ?? '—'}
                              {comanda.canal === 'mesa' && ` · ${comanda.comensales} pax`}
                            </p>
                          </div>
                          <Badge variant="secondary" className={cn('border-0 gap-1', tono.clase)}>
                            <Clock className="size-3" />
                            {minutos} min
                          </Badge>
                        </div>

                        <div className="flex flex-col gap-2">
                          {comanda.items.map((item) => (
                            <div
                              key={item.indice}
                              className={cn(
                                'rounded-lg border p-2.5',
                                item.estadoItem === 'listo' && 'opacity-60',
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm">
                                  <span className="font-semibold text-primary">
                                    {item.cantidad}×
                                  </span>{' '}
                                  <span
                                    className={cn(
                                      item.estadoItem === 'listo' && 'line-through',
                                    )}
                                  >
                                    {item.nombre}
                                  </span>
                                </p>
                                <div className="flex shrink-0 gap-1">
                                  {item.estadoItem !== 'preparando' && item.estadoItem !== 'listo' && (
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="size-7"
                                      disabled={pendiente}
                                      aria-label="Empezar preparación"
                                      onClick={() =>
                                        ejecutar(
                                          () =>
                                            cambiarEstadoItem(comanda.id, item.indice, 'preparando'),
                                          'Platillo en preparación',
                                        )
                                      }
                                    >
                                      <Flame className="size-3.5" />
                                    </Button>
                                  )}
                                  {item.estadoItem !== 'listo' && (
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="size-7"
                                      disabled={pendiente}
                                      aria-label="Marcar listo"
                                      onClick={() =>
                                        ejecutar(
                                          () => cambiarEstadoItem(comanda.id, item.indice, 'listo'),
                                          'Platillo listo',
                                        )
                                      }
                                    >
                                      <Check className="size-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {item.modificadores.length > 0 && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {item.modificadores.join(' · ')}
                                </p>
                              )}
                              {item.notas && (
                                <p className="mt-1 rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-800 dark:text-amber-200">
                                  {item.notas}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>

                        {comanda.notas && (
                          <p className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                            {comanda.notas}
                          </p>
                        )}

                        <div className="flex gap-2">
                          {comanda.estado === 'nuevo' && (
                            <Button
                              size="sm"
                              className="flex-1"
                              disabled={pendiente}
                              onClick={() =>
                                ejecutar(
                                  () => cambiarEstadoPedido(comanda.id, 'en_preparacion'),
                                  'Comanda aceptada',
                                )
                              }
                            >
                              <Flame className="size-4" />
                              Aceptar comanda
                            </Button>
                          )}
                          {comanda.estado === 'en_preparacion' && (
                            <Button
                              size="sm"
                              className="flex-1"
                              disabled={pendiente}
                              onClick={() =>
                                ejecutar(
                                  () => cambiarEstadoPedido(comanda.id, 'listo'),
                                  'Comanda lista',
                                )
                              }
                            >
                              <Check className="size-4" />
                              Marcar todo listo
                            </Button>
                          )}
                          {comanda.estado === 'listo' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="flex-1"
                              disabled={pendiente}
                              onClick={() =>
                                ejecutar(
                                  () => cambiarEstadoPedido(comanda.id, 'servido'),
                                  'Entregado al cliente',
                                )
                              }
                            >
                              <BellRing className="size-4" />
                              Entregado
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
