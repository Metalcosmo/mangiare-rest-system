import { ArrowUpRight, BellRing, Plus, Users } from 'lucide-react'
import Link from 'next/link'

import { EtiquetaEstado } from '@/components/panel/etiqueta-estado'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export type MesaVista = {
  id: string
  nombre: string
  zona: string
  capacidad: number
  estado: string
  folio: string | null
  pedidoId: string | null
  totalTexto: string | null
  comandas: number
  /** Quien abrió la mesa desde el QR. */
  anfitrion: string | null
  /** Comandas ya enviadas que forman la cuenta. */
  rondas: number
  /** Platillos que la mesa armó y todavía no manda al mesero. */
  sinEnviar: number
  /** Pedidos de esta mesa esperando la confirmación del mesero. */
  porConfirmar: number
}

/**
 * Lista de mesas pensada para el teléfono del mesero: tarjetas en lugar de una
 * tabla, con la acción principal (tomar pedido) siempre a la vista.
 */
export function ListaMesas({ mesas }: { mesas: MesaVista[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {mesas.map((mesa) => (
        <Card
          key={mesa.id}
          className={mesa.porConfirmar > 0 ? 'border-amber-500/60 bg-amber-500/5' : undefined}
        >
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold leading-tight">
                  {mesa.nombre}
                  {mesa.anfitrion ? ` · ${mesa.anfitrion}` : ''}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {mesa.zona} · {mesa.capacidad}{' '}
                  {mesa.capacidad === 1 ? 'lugar' : 'lugares'}
                </p>
              </div>
              <EtiquetaEstado valor={mesa.estado} />
            </div>

            {mesa.totalTexto ? (
              <div className="rounded-lg border bg-background/60 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Cuenta abierta
                </p>
                <p className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{mesa.folio ?? '—'}</span>
                  <span className="shrink-0 font-semibold">{mesa.totalTexto}</span>
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {mesa.comandas} {mesa.comandas === 1 ? 'línea' : 'líneas'} · {mesa.rondas}{' '}
                  {mesa.rondas === 1 ? 'ronda' : 'rondas'}
                </p>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
                Sin pedidos activos
              </p>
            )}

            {mesa.sinEnviar > 0 && (
              <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                {mesa.sinEnviar === 1
                  ? '1 platillo sin enviar al mesero'
                  : `${mesa.sinEnviar} platillos sin enviar al mesero`}
              </p>
            )}

            {mesa.porConfirmar > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-500/15 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                <BellRing className="size-3.5 shrink-0" />
                {mesa.porConfirmar === 1
                  ? '1 pedido espera tu confirmación'
                  : `${mesa.porConfirmar} pedidos esperan tu confirmación`}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button asChild size="sm" variant="outline" className="flex-1">
                <Link href={`/panel/pos?mesa=${mesa.id}`}>
                  <Plus className="size-3.5" />
                  Tomar pedido
                </Link>
              </Button>

              {mesa.porConfirmar > 0 ? (
                <Button asChild size="sm" className="flex-1">
                  <Link href={`/panel/mesero?vista=confirmar&q=${encodeURIComponent(mesa.nombre)}`}>
                    <BellRing className="size-3.5" />
                    Confirmar
                  </Link>
                </Button>
              ) : (
                mesa.pedidoId && (
                  <Button asChild size="sm" variant="ghost" className="flex-1">
                    <Link href={`/panel/pedidos/${mesa.pedidoId}`}>
                      <ArrowUpRight className="size-3.5" />
                      Ver pedido
                    </Link>
                  </Button>
                )
              )}
            </div>

            {!mesa.pedidoId && mesa.estado === 'ocupada' && (
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Users className="size-3.5" />
                Ocupada sin pedidos activos
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      {mesas.length === 0 && (
        <Card className="border-dashed sm:col-span-2 xl:col-span-3">
          <CardContent className="px-6 py-12 text-center">
            <p className="font-medium">No hay mesas con este filtro</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Prueba con «Todas» o cambia la zona para ver otras mesas.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
