'use client'

import {
  ArrowUpRight,
  BellRing,
  CalendarClock,
  CircleCheck,
  CircleX,
  Loader2,
  Sparkles,
  Trash2,
  Users,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { descartarPedidoEnBorrador } from '@/actions/borrador'
import { cambiarEstadoMesa } from '@/actions/salon'
import { EtiquetaEstado } from '@/components/panel/etiqueta-estado'
import {
  CAJA_ESTADO,
  ETIQUETA_ESTADO_MESA,
  ETIQUETA_FORMA,
  FORMA_MESA,
  type EstadoMesa,
} from '@/components/panel/salon/estados'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export type MesaMapa = {
  id: string
  slug: string | null
  nombre: string
  capacidad: number
  forma: string
  estado: string
  /** Posición en porcentaje dentro del mapa (0-100). */
  x: number
  y: number
  zonaNombre: string
  folio: string | null
  /** Identificador del primer pedido activo, para enlazar a su detalle. */
  pedidoId: string | null
  totalTexto: string | null
  comandas: number
  /** Quien abrió la mesa desde el QR. */
  anfitrion: string | null
  /** Comandas ya enviadas que forman la cuenta. */
  rondas: number
  /** Platillos que la mesa armó y todavía no manda al mesero. */
  sinEnviar: number
  /** Pedidos esperando la confirmación del mesero. */
  porConfirmar: number
}

export type ZonaMapa = {
  id: string
  nombre: string
  color: string
  mesas: MesaMapa[]
}

const FONDO_CUADRICULA = {
  backgroundImage:
    'linear-gradient(to right, color-mix(in oklab, var(--border) 65%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--border) 65%, transparent) 1px, transparent 1px)',
  backgroundSize: '32px 32px',
}

const ESTADOS_ACCION: Array<{ valor: EstadoMesa; icono: LucideIcon; punto: string }> = [
  { valor: 'libre', icono: CircleCheck, punto: 'bg-emerald-500' },
  { valor: 'ocupada', icono: Users, punto: 'bg-destructive' },
  { valor: 'reservada', icono: CalendarClock, punto: 'bg-violet-500' },
  { valor: 'limpieza', icono: Sparkles, punto: 'bg-amber-500' },
  { valor: 'fuera_servicio', icono: CircleX, punto: 'bg-muted-foreground' },
]

/** Plano del salón: una sección por zona con las mesas posicionadas. */
export function MapaSalon({
  zonas,
  puedeCambiarEstado = true,
}: {
  zonas: ZonaMapa[]
  /** El rol actual puede actualizar mesas (access de la colección `mesas`). */
  puedeCambiarEstado?: boolean
}) {
  const [seleccionada, setSeleccionada] = useState<MesaMapa | null>(null)

  return (
    <>
      <div className="space-y-6">
        {zonas.map((zona) => (
          <section key={zona.id} className="overflow-hidden rounded-xl border bg-card">
            <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: zona.color }}
                />
                <h2 className="truncate text-sm font-semibold">{zona.nombre}</h2>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {zona.mesas.length} {zona.mesas.length === 1 ? 'mesa' : 'mesas'}
              </span>
            </header>

            <div className="p-4">
              <div
                className="relative h-[520px] overflow-hidden rounded-lg border bg-muted/20"
                style={FONDO_CUADRICULA}
              >
                {zona.mesas.map((mesa) => (
                  <BotonMesa key={mesa.id} mesa={mesa} onSeleccionar={setSeleccionada} />
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>

      <PanelMesa
        mesa={seleccionada}
        puedeCambiarEstado={puedeCambiarEstado}
        onCerrar={() => setSeleccionada(null)}
      />
    </>
  )
}

function BotonMesa({
  mesa,
  onSeleccionar,
}: {
  mesa: MesaMapa
  onSeleccionar: (mesa: MesaMapa) => void
}) {
  const caja = CAJA_ESTADO[mesa.estado] ?? CAJA_ESTADO.libre
  const forma = FORMA_MESA[mesa.forma] ?? FORMA_MESA.cuadrada

  return (
    <button
      type="button"
      onClick={() => onSeleccionar(mesa)}
      style={{ left: `${mesa.x}%`, top: `${mesa.y}%`, transform: 'translate(-50%, -50%)' }}
      title={`${mesa.nombre} · ${mesa.capacidad} personas · ${
        ETIQUETA_ESTADO_MESA[mesa.estado] ?? mesa.estado
      }${mesa.anfitrion ? ` · Abierta por ${mesa.anfitrion}` : ''}${
        mesa.sinEnviar > 0 ? ` · ${mesa.sinEnviar} sin enviar` : ''
      }`}
      className={cn(
        'absolute flex flex-col items-center justify-center overflow-hidden border-2 p-1 text-center shadow-sm transition-transform hover:z-20 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        forma,
        caja,
      )}
    >
      <span className="max-w-full truncate text-[11px] font-semibold leading-tight">
        {mesa.nombre}
      </span>

      {mesa.totalTexto ? (
        <>
          {mesa.folio && (
            <span className="max-w-full truncate text-[9px] leading-tight opacity-90">
              {mesa.folio}
            </span>
          )}
          <span className="text-[10px] font-semibold leading-tight">{mesa.totalTexto}</span>
        </>
      ) : (
        <span className="text-[9px] leading-tight opacity-80">{mesa.capacidad} pers.</span>
      )}

      {mesa.comandas > 1 && (
        <span className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-background/90 text-[9px] font-bold ring-1 ring-border">
          {mesa.comandas}
        </span>
      )}

      {mesa.porConfirmar > 0 && (
        <span
          className="absolute left-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white"
          title={
            mesa.porConfirmar === 1
              ? '1 pedido espera confirmación'
              : `${mesa.porConfirmar} pedidos esperan confirmación`
          }
        >
          <BellRing className="size-2.5" />
        </span>
      )}
    </button>
  )
}

function PanelMesa({
  mesa,
  puedeCambiarEstado,
  onCerrar,
}: {
  mesa: MesaMapa | null
  puedeCambiarEstado: boolean
  onCerrar: () => void
}) {
  const router = useRouter()
  const [enviando, setEnviando] = useState<EstadoMesa | null>(null)
  const [descartando, iniciarDescarte] = useTransition()
  const [, iniciarTransicion] = useTransition()

  const aplicar = (estado: EstadoMesa) => {
    if (!mesa) return
    setEnviando(estado)
    iniciarTransicion(async () => {
      const resultado = await cambiarEstadoMesa(mesa.id, estado)
      setEnviando(null)
      if (resultado?.error) {
        toast.error(resultado.error)
        return
      }
      toast.success(resultado?.mensaje ?? 'Estado actualizado.')
      onCerrar()
      router.refresh()
    })
  }

  const descartar = (objetivo: MesaMapa) => {
    if (!objetivo.slug) return
    iniciarDescarte(async () => {
      const resultado = await descartarPedidoEnBorrador(objetivo.slug!)
      if (resultado?.error) {
        toast.error(resultado.error)
        return
      }
      toast.success(resultado?.mensaje ?? 'Descartado.')
      router.refresh()
    })
  }

  return (
    <Sheet
      open={Boolean(mesa)}
      onOpenChange={(abierto) => {
        if (!abierto) onCerrar()
      }}
    >
      <SheetContent className="w-full sm:max-w-md">
        {mesa && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {mesa.nombre}
                <EtiquetaEstado valor={mesa.estado} />
              </SheetTitle>
              <SheetDescription>
                {mesa.zonaNombre} · {mesa.capacidad} personas ·{' '}
                {ETIQUETA_FORMA[mesa.forma] ?? 'Cuadrada'}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {mesa.totalTexto && (
                <div className="rounded-xl border bg-muted/40 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Pedido activo
                  </p>
                  <p className="mt-1 text-xl font-semibold tracking-tight">{mesa.totalTexto}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {mesa.rondas} {mesa.rondas === 1 ? 'ronda' : 'rondas'} ·{' '}
                    {mesa.comandas} {mesa.comandas === 1 ? 'comanda' : 'comandas'}
                    {mesa.anfitrion ? ` · ${mesa.anfitrion}` : ''}
                  </p>
                  <Button asChild size="sm" variant="outline" className="mt-3">
                    <Link href={mesa.pedidoId ? `/panel/pedidos/${mesa.pedidoId}` : '/panel/pedidos'}>
                      Abrir pedido
                      <ArrowUpRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              )}

              {mesa.sinEnviar > 0 && (
                <div className="rounded-xl border border-amber-500/60 bg-amber-500/5 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
                    Sin enviar
                  </p>
                  <p className="mt-1 text-sm">
                    La mesa tiene {mesa.sinEnviar}{' '}
                    {mesa.sinEnviar === 1 ? 'platillo armado' : 'platillos armados'} que todavía no
                    manda al mesero. No entra a la cuenta hasta que el anfitrión lo envíe.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    disabled={Boolean(enviando) || !mesa.slug}
                    onClick={() => descartar(mesa)}
                  >
                    <Trash2 className="size-3.5" />
                    Descartar lo que están pidiendo
                  </Button>
                </div>
              )}

              {mesa.porConfirmar > 0 && (
                <div className="rounded-xl border border-amber-500/60 bg-amber-500/5 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
                    Por confirmar
                  </p>
                  <p className="mt-1 text-sm">
                    {mesa.porConfirmar === 1
                      ? '1 pedido del cliente espera la confirmación de un mesero.'
                      : `${mesa.porConfirmar} pedidos del cliente esperan la confirmación de un mesero.`}
                  </p>
                  <Button asChild size="sm" variant="outline" className="mt-3">
                    <Link
                      href={`/panel/mesero?vista=confirmar&q=${encodeURIComponent(mesa.nombre)}`}
                    >
                      <BellRing className="size-3.5" />
                      Confirmar
                      <ArrowUpRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              )}

              <div>
                <p className="mb-2 text-sm font-medium">Cambiar estado de la mesa</p>
                {!puedeCambiarEstado && (
                  <p className="mb-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                    Tu rol puede consultar el salón, pero no modificar el estado de las mesas.
                  </p>
                )}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {ESTADOS_ACCION.map((opcion) => {
                    const actual = mesa.estado === opcion.valor
                    const Icono = opcion.icono
                    return (
                      <Button
                        key={opcion.valor}
                        type="button"
                        variant={actual ? 'default' : 'outline'}
                        className="justify-start"
                        disabled={actual || !puedeCambiarEstado || Boolean(enviando)}
                        onClick={() => aplicar(opcion.valor)}
                      >
                        {enviando === opcion.valor ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <span className={cn('size-2.5 rounded-full', opcion.punto)} />
                        )}
                        <Icono className="size-4 opacity-70" />
                        {ETIQUETA_ESTADO_MESA[opcion.valor]}
                      </Button>
                    )
                  })}
                </div>
                {mesa.estado === 'ocupada' && !mesa.totalTexto && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    La mesa está marcada como ocupada pero no tiene pedidos activos.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
