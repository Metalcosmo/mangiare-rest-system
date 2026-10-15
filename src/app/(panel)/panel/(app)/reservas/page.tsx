import {
  AlertTriangle,
  Armchair,
  Briefcase,
  Cake,
  CalendarClock,
  CalendarDays,
  Heart,
  PartyPopper,
  Phone,
  Users,
  type LucideIcon,
} from 'lucide-react'

import { DialogoRegistro } from '@/components/panel/dialogo-registro'
import { EncabezadoPagina } from '@/components/panel/encabezado-pagina'
import { EstadoVacio } from '@/components/panel/estado-vacio'
import { EtiquetaEstado } from '@/components/panel/etiqueta-estado'
import {
  AccionesReservacion,
  type OpcionMesa,
} from '@/components/panel/reservas/acciones-reservacion'
import { FiltrosReservas } from '@/components/panel/reservas/filtros'
import { TablaRecursos, type Fila } from '@/components/panel/tabla-recursos'
import { TarjetaKpi } from '@/components/panel/tarjeta-kpi'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { requireRol } from '@/lib/auth'
import { hhmm, numero } from '@/lib/formato'
import { claveDe } from '@/lib/ids'
import { obtenerOpciones } from '@/lib/opciones'
import { etiquetaDe, getPayloadClient, obtenerAjustes } from '@/lib/payload'
import { cn } from '@/lib/utils'

export const metadata = {
  title: 'Reservaciones',
  description: 'Agenda, próximas reservas e historial',
}

/** Estados que representan una reservación vigente. */
const ESTADOS_ACTIVOS = ['pendiente', 'confirmada', 'sentada']

/** Rango de solapamiento (en minutos) que se considera conflicto de mesa. */
const VENTANA_CONFLICTO = 120

const OCASIONES: Record<string, { etiqueta: string; icono: LucideIcon; clase: string }> = {
  cumpleanos: {
    etiqueta: 'Cumpleaños',
    icono: Cake,
    clase: 'border-0 bg-pink-500/15 text-pink-700 dark:text-pink-300',
  },
  aniversario: {
    etiqueta: 'Aniversario',
    icono: Heart,
    clase: 'border-0 bg-rose-500/15 text-rose-700 dark:text-rose-300',
  },
  negocios: {
    etiqueta: 'Comida de negocios',
    icono: Briefcase,
    clase: 'border-0 bg-sky-500/15 text-sky-700 dark:text-sky-300',
  },
  celebracion: {
    etiqueta: 'Celebración',
    icono: PartyPopper,
    clase: 'border-0 bg-amber-500/15 text-amber-700 dark:text-amber-300',
  },
}

type ReservaCruda = {
  id: number | string
  nombreCliente?: string | null
  telefono?: string | null
  email?: string | null
  fecha?: string | null
  hora?: string | null
  personas?: number | null
  estado?: string | null
  ocasion?: string | null
  notas?: string | null
  mesa?: unknown
  zona?: unknown
}

type MesaCruda = {
  id: number | string
  nombre?: string | null
  capacidad?: number | null
  activa?: boolean | null
  estado?: string | null
  zona?: unknown
}

type ReservaVista = ReservaCruda & {
  dia: string
  minutos: number
  mesaId: string
  mesaNombre: string
  zonaNombre: string
  personasNum: number
}

const aFecha = (valor: unknown): Date | null => {
  if (!valor) return null
  const fecha = valor instanceof Date ? valor : new Date(String(valor))
  return Number.isNaN(fecha.getTime()) ? null : fecha
}

/** Clave local `YYYY-MM-DD` de una fecha, sin desfases de zona horaria. */
const diaLocal = (valor: unknown): string => {
  const fecha = aFecha(valor)
  if (!fecha) return ''
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

const minutosDeHora = (hora?: string | null): number => {
  const coincidencia = /^(\d{1,2}):(\d{2})/.exec((hora ?? '').trim())
  if (!coincidencia) return 0
  return Number(coincidencia[1]) * 60 + Number(coincidencia[2])
}

/** Formatea una clave `YYYY-MM-DD` como "lunes, 13 de octubre". */
const formatearDia = (clave: string): string => {
  const [anio, mes, dia] = clave.split('-').map(Number)
  if (!anio || !mes || !dia) return clave
  const texto = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(anio, mes - 1, dia))
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

const porDiaYHora = (a: ReservaVista, b: ReservaVista): number =>
  a.dia === b.dia ? a.minutos - b.minutos : a.dia < b.dia ? -1 : 1

type Props = {
  searchParams: Promise<{ fecha?: string; estado?: string }>
}

export default async function PaginaReservas({ searchParams }: Props) {
  await requireRol('admin', 'gerente', 'mesero')

  const { fecha: fechaParam, estado: estadoParam } = await searchParams

  const payload = await getPayloadClient()
  const [reservasRes, mesasRes, opciones, ajustes] = await Promise.all([
    payload.find({
      collection: 'reservaciones',
      depth: 1,
      limit: 500,
      pagination: false,
      sort: 'fecha',
      overrideAccess: true,
    }),
    payload.find({
      collection: 'mesas',
      depth: 1,
      limit: 300,
      pagination: false,
      sort: 'nombre',
      overrideAccess: true,
    }),
    obtenerOpciones(['mesas', 'zonas', 'clientes']),
    obtenerAjustes(),
  ])

  const mesas = mesasRes.docs as unknown as MesaCruda[]
  const mesasPorId = new Map(mesas.map((mesa) => [String(mesa.id), mesa]))

  const vistas: ReservaVista[] = (reservasRes.docs as unknown as ReservaCruda[]).map((reserva) => {
    const mesaId = claveDe(reserva.mesa)
    const mesa = mesasPorId.get(mesaId)
    const zonaDeMesa = mesa ? etiquetaDe(mesa.zona) : '—'
    const zonaPropia = reserva.zona ? etiquetaDe(reserva.zona) : ''

    return {
      ...reserva,
      dia: diaLocal(reserva.fecha),
      minutos: minutosDeHora(reserva.hora),
      mesaId,
      mesaNombre: mesa?.nombre ?? (reserva.mesa ? etiquetaDe(reserva.mesa) : ''),
      zonaNombre: zonaPropia || (zonaDeMesa === '—' ? '' : zonaDeMesa),
      personasNum: reserva.personas ?? 0,
    }
  })

  const ahora = new Date()
  const claveHoy = diaLocal(ahora)
  const anioActual = ahora.getFullYear()
  const mesActual = ahora.getMonth()

  const hoy = vistas.filter((reserva) => reserva.dia === claveHoy).sort(porDiaYHora)
  const proximas = vistas
    .filter((reserva) => reserva.dia > claveHoy && ESTADOS_ACTIVOS.includes(reserva.estado ?? ''))
    .sort(porDiaYHora)
  const historial = vistas
    .filter((reserva) => reserva.dia !== '' && reserva.dia < claveHoy)
    .sort((a, b) => porDiaYHora(b, a))

  const fechaAgenda = /^\d{4}-\d{2}-\d{2}$/.test(fechaParam ?? '') ? (fechaParam as string) : claveHoy
  const agenda = vistas
    .filter(
      (reserva) =>
        reserva.dia === fechaAgenda && (!estadoParam || reserva.estado === estadoParam),
    )
    .sort(porDiaYHora)

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const comensalesHoy = hoy
    .filter((reserva) => !['cancelada', 'no_asistio'].includes(reserva.estado ?? ''))
    .reduce((suma, reserva) => suma + reserva.personasNum, 0)

  const pendientes = vistas.filter(
    (reserva) => reserva.estado === 'pendiente' && reserva.dia >= claveHoy,
  ).length

  const delMes = vistas.filter((reserva) => {
    const fecha = aFecha(reserva.fecha)
    return fecha && fecha.getFullYear() === anioActual && fecha.getMonth() === mesActual
  })
  const resueltasMes = delMes.filter((reserva) =>
    ['completada', 'no_asistio', 'sentada'].includes(reserva.estado ?? ''),
  )
  const noShowMes = delMes.filter((reserva) => reserva.estado === 'no_asistio').length
  const tasaNoShow = resueltasMes.length
    ? Math.round((noShowMes / resueltasMes.length) * 100)
    : 0

  // ── Conflictos de mesa (misma mesa y ±2 h) ───────────────────────────────
  const vigentes = vistas.filter(
    (reserva) => ESTADOS_ACTIVOS.includes(reserva.estado ?? '') && reserva.mesaId,
  )
  const conflictos: Array<{ a: ReservaVista; b: ReservaVista }> = []
  for (let i = 0; i < vigentes.length; i += 1) {
    for (let j = i + 1; j < vigentes.length; j += 1) {
      const a = vigentes[i]
      const b = vigentes[j]
      if (a.dia !== b.dia || a.mesaId !== b.mesaId) continue
      if (Math.abs(a.minutos - b.minutos) <= VENTANA_CONFLICTO) conflictos.push({ a, b })
    }
  }
  const idsEnConflicto = new Set(
    conflictos.flatMap((conflicto) => [String(conflicto.a.id), String(conflicto.b.id)]),
  )

  // ── Mesas compatibles por reservación ────────────────────────────────────
  const opcionesMesaPara = (reserva: ReservaVista): OpcionMesa[] => {
    const compatibles = mesas.filter(
      (mesa) =>
        mesa.activa !== false &&
        mesa.estado !== 'fuera_servicio' &&
        (mesa.capacidad ?? 0) >= reserva.personasNum,
    )
    const actual = reserva.mesaId
      ? mesas.find(
          (mesa) =>
            String(mesa.id) === reserva.mesaId &&
            !compatibles.some((compatible) => String(compatible.id) === reserva.mesaId),
        )
      : undefined

    const lista = actual ? [actual, ...compatibles] : compatibles

    return lista.map((mesa) => ({
      value: String(mesa.id),
      label: `${mesa.nombre ?? 'Mesa'} · ${mesa.capacidad ?? 0} pers.${
        String(mesa.id) === reserva.mesaId ? ' (actual)' : ''
      }`,
    }))
  }

  const grupos = new Map<string, ReservaVista[]>()
  for (const reserva of proximas) {
    const lista = grupos.get(reserva.dia) ?? []
    lista.push(reserva)
    grupos.set(reserva.dia, lista)
  }

  return (
    <div>
      <EncabezadoPagina
        titulo="Reservaciones"
        descripcion="Agenda del día, próximas reservas e historial de no-shows."
        icono={CalendarClock}
      >
        <DialogoRegistro
          recurso="reservaciones"
          opciones={opciones}
          etiqueta="Nueva reservación"
        />
      </EncabezadoPagina>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <TarjetaKpi
          etiqueta="Reservaciones de hoy"
          valor={numero(hoy.length)}
          detalle={`${hoy.filter((r) => r.estado === 'confirmada').length} confirmadas`}
          icono={CalendarClock}
          acento="primario"
        />
        <TarjetaKpi
          etiqueta="Comensales esperados"
          valor={numero(comensalesHoy)}
          detalle="Suma de personas para hoy"
          icono={Users}
          acento="exito"
        />
        <TarjetaKpi
          etiqueta="No-show del mes"
          valor={`${tasaNoShow}%`}
          detalle={`${noShowMes} de ${resueltasMes.length} reservaciones del mes`}
          icono={AlertTriangle}
          acento={tasaNoShow > 15 ? 'peligro' : 'aviso'}
        />
        <TarjetaKpi
          etiqueta="Por confirmar"
          valor={numero(pendientes)}
          detalle="Pendientes de hoy en adelante"
          icono={CalendarDays}
          acento="primario"
        />
      </div>

      {conflictos.length > 0 && (
        <Alert className="mb-6 border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200">
          <AlertTriangle />
          <AlertTitle>Posible conflicto de mesas</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {conflictos.slice(0, 5).map((conflicto) => (
                <li key={`${conflicto.a.id}-${conflicto.b.id}`}>
                  <span className="font-medium">{conflicto.a.mesaNombre || 'Mesa sin asignar'}</span>{' '}
                  · {formatearDia(conflicto.a.dia)}: {conflicto.a.nombreCliente} (
                  {hhmm(conflicto.a.hora)}) y {conflicto.b.nombreCliente} ({hhmm(conflicto.b.hora)})
                </li>
              ))}
            </ul>
            {conflictos.length > 5 && (
              <p className="mt-1">Y {conflictos.length - 5} conflictos más.</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="hoy" className="gap-6">
        <TabsList>
          <TabsTrigger value="hoy">Hoy</TabsTrigger>
          <TabsTrigger value="proximas">Próximas</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="hoy" className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Agenda: {formatearDia(fechaAgenda)}</h2>
              <p className="text-sm text-muted-foreground">
                {agenda.length} {agenda.length === 1 ? 'reservación' : 'reservaciones'}
                {estadoParam ? ` · filtro "${estadoParam}"` : ''}
              </p>
            </div>
            <FiltrosReservas fecha={fechaAgenda} estado={estadoParam ?? ''} />
          </div>

          {agenda.length === 0 ? (
            <EstadoVacio
              titulo="Sin reservaciones para esta fecha"
              descripcion="Cambia la fecha o el estado para ver otras reservaciones."
              icono={CalendarClock}
            />
          ) : (
            <div className="space-y-3">
              {agenda.map((reserva) => (
                <TarjetaReserva
                  key={String(reserva.id)}
                  reserva={reserva}
                  mesas={opcionesMesaPara(reserva)}
                  enConflicto={idsEnConflicto.has(String(reserva.id))}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="proximas" className="space-y-6">
          {grupos.size === 0 ? (
            <EstadoVacio
              titulo="No hay reservaciones próximas"
              descripcion="Aquí aparecerán las reservaciones desde mañana en adelante."
              icono={CalendarDays}
            />
          ) : (
            [...grupos.entries()].map(([dia, lista]) => (
              <section key={dia} className="space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">{formatearDia(dia)}</h2>
                  <Badge variant="secondary">{lista.length}</Badge>
                </div>
                {lista.map((reserva) => (
                  <TarjetaReserva
                    key={String(reserva.id)}
                    reserva={reserva}
                    mesas={opcionesMesaPara(reserva)}
                    enConflicto={idsEnConflicto.has(String(reserva.id))}
                  />
                ))}
              </section>
            ))
          )}
        </TabsContent>

        <TabsContent value="historial" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Reservaciones pasadas</h2>
            <p className="text-sm text-muted-foreground">
              {historial.length} {historial.length === 1 ? 'registro' : 'registros'} anteriores a
              hoy.
            </p>
          </div>
          <TablaRecursos
            recurso="reservaciones"
            filas={historial as unknown as Fila[]}
            opciones={opciones}
            ajustes={ajustes}
            mensajeVacio={{ titulo: 'Todavía no hay reservaciones pasadas.' }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TarjetaReserva({
  reserva,
  mesas,
  enConflicto,
}: {
  reserva: ReservaVista
  mesas: OpcionMesa[]
  enConflicto: boolean
}) {
  const ocasion = reserva.ocasion ? OCASIONES[reserva.ocasion] : undefined
  const Icono = ocasion?.icono

  return (
    <Card className={cn('overflow-hidden', enConflicto && 'border-amber-500/60')}>
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
        <div className="flex shrink-0 flex-row items-center gap-3 rounded-xl bg-muted px-4 py-3 sm:w-24 sm:flex-col sm:gap-0.5">
          <span className="text-lg font-semibold tabular-nums">{hhmm(reserva.hora)}</span>
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {reserva.personasNum} pers.
          </span>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{reserva.nombreCliente ?? 'Cliente'}</p>
            <EtiquetaEstado valor={reserva.estado} />
            {ocasion && Icono && (
              <Badge variant="secondary" className={ocasion.clase}>
                <Icono className="size-3" />
                {ocasion.etiqueta}
              </Badge>
            )}
            {enConflicto && (
              <Badge
                variant="secondary"
                className="border-0 bg-amber-500/15 text-amber-700 dark:text-amber-300"
              >
                <AlertTriangle className="size-3" />
                Conflicto de mesa
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-3.5" />
              {reserva.personasNum} personas
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Armchair className="size-3.5" />
              {reserva.mesaNombre || 'Sin mesa'}
              {reserva.zonaNombre ? ` · ${reserva.zonaNombre}` : ''}
            </span>
            {reserva.telefono && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="size-3.5" />
                {reserva.telefono}
              </span>
            )}
          </div>

          {reserva.notas && (
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              {reserva.notas}
            </p>
          )}

          <AccionesReservacion
            id={String(reserva.id)}
            estado={reserva.estado ?? 'pendiente'}
            mesaId={reserva.mesaId || null}
            mesas={mesas}
          />
        </div>
      </CardContent>
    </Card>
  )
}
