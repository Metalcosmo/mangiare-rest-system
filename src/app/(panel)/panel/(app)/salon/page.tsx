import {
  CalendarClock,
  CircleCheck,
  LayoutGrid,
  Sparkles,
  Table2,
  Users,
} from 'lucide-react'

import { EncabezadoPagina } from '@/components/panel/encabezado-pagina'
import { EstadoVacio } from '@/components/panel/estado-vacio'
import { AutoRefresco } from '@/components/panel/auto-refresco'
import { FiltroZona } from '@/components/panel/salon/filtro-zona'
import { ESTADOS_MESA } from '@/components/panel/salon/estados'
import { MapaSalon, type MesaMapa, type ZonaMapa } from '@/components/panel/salon/mapa-salon'
import { TarjetaKpi } from '@/components/panel/tarjeta-kpi'
import { requireRol } from '@/lib/auth'
import { moneda, numero } from '@/lib/formato'
import { claveDe } from '@/lib/ids'
import { getPayloadClient, obtenerAjustes } from '@/lib/payload'
import { ESTADOS_ACTIVOS } from '@/lib/pedidos'
import { cn } from '@/lib/utils'

export const metadata = {
  title: 'Mapa de salón',
  description: 'Estado en vivo de las mesas del restaurante',
}

type SesionCruda = {
  id: number | string
  mesa?: unknown
  anfitrionNombre?: string | null
}

type BorradorCrudo = {
  id: number | string
  mesa?: unknown
  items?: Array<{ cantidad?: number | null }> | null
}

type ZonaCruda = {
  id: number | string
  nombre?: string | null
  color?: string | null
  activa?: boolean | null
}

type MesaCruda = {
  id: number | string
  slug?: string | null
  nombre?: string | null
  capacidad?: number | null
  forma?: string | null
  estado?: string | null
  posicionX?: number | null
  posicionY?: number | null
  activa?: boolean | null
  zona?: unknown
}

type PedidoActivo = {
  id: number | string
  folio?: string | null
  estado?: string | null
  total?: number | null
  items?: unknown[] | null
  mesa?: unknown
}

/** Mantiene las posiciones dentro del mapa aunque el dato venga fuera de rango. */
const limitar = (valor: number): number =>
  Math.min(100, Math.max(0, Number.isFinite(valor) ? valor : 0))

type Props = {
  searchParams: Promise<{ zona?: string }>
}

export default async function PaginaSalon({ searchParams }: Props) {
  const usuario = await requireRol('admin', 'gerente', 'mesero', 'cajero')

  // La colección `mesas` sólo permite escribir a admin, gerente y cocina.
  const puedeCambiarEstado = ['admin', 'gerente', 'cocina'].includes(usuario.rol ?? '')

  const { zona } = await searchParams
  const payload = await getPayloadClient()
  const ajustes = await obtenerAjustes()

  const [zonasRes, mesasRes, pedidosRes, sesionesRes, borradoresRes] = await Promise.all([
    payload.find({
      collection: 'zonas',
      depth: 0,
      limit: 100,
      pagination: false,
      sort: 'orden',
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
    payload.find({
      collection: 'pedidos',
      where: { estado: { in: ESTADOS_ACTIVOS } },
      depth: 1,
      limit: 300,
      pagination: false,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'sesiones-mesa',
      where: { estado: { equals: 'abierta' } },
      depth: 0,
      limit: 300,
      pagination: false,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'pedidos',
      where: { estado: { equals: 'borrador' } },
      depth: 0,
      limit: 300,
      pagination: false,
      overrideAccess: true,
    }),
  ])

  const zonas = zonasRes.docs as unknown as ZonaCruda[]
  const mesas = mesasRes.docs as unknown as MesaCruda[]
  const pedidos = pedidosRes.docs as unknown as PedidoActivo[]
  const sesiones = sesionesRes.docs as unknown as SesionCruda[]
  const borradores = borradoresRes.docs as unknown as BorradorCrudo[]

  const sesionPorMesa = new Map<string, SesionCruda>()
  for (const sesion of sesiones) {
    const clave = claveDe(sesion.mesa)
    if (clave) sesionPorMesa.set(clave, sesion)
  }

  const sinEnviarPorMesa = new Map<string, number>()
  for (const borrador of borradores) {
    const clave = claveDe(borrador.mesa)
    if (!clave) continue
    const cantidad = (borrador.items ?? []).reduce(
      (suma, item) => suma + (item.cantidad ?? 0),
      0,
    )
    sinEnviarPorMesa.set(clave, (sinEnviarPorMesa.get(clave) ?? 0) + cantidad)
  }

  // Pedidos activos agrupados por mesa, para pintarlos sobre cada mesa.
  const pedidosPorMesa = new Map<string, PedidoActivo[]>()
  for (const pedido of pedidos) {
    const clave = claveDe(pedido.mesa)
    if (!clave) continue
    const lista = pedidosPorMesa.get(clave) ?? []
    lista.push(pedido)
    pedidosPorMesa.set(clave, lista)
  }

  const aMesaMapa = (mesa: MesaCruda, zonaNombre: string): MesaMapa => {
    const activos = pedidosPorMesa.get(String(mesa.id)) ?? []
    const pendientes = activos.filter((pedido) => pedido.estado === 'por_confirmar')
    // La cuenta son sólo los pedidos ya aprobados; lo pendiente aún no lo es.
    const cuenta = activos.filter((pedido) => pedido.estado !== 'por_confirmar')
    const total = cuenta.reduce((suma, pedido) => suma + (pedido.total ?? 0), 0)
    const comandas = cuenta.reduce((suma, pedido) => suma + (pedido.items?.length ?? 0), 0)

    const claveMesa = String(mesa.id)

    return {
      id: claveMesa,
      slug: mesa.slug ?? null,
      nombre: mesa.nombre ?? 'Mesa',
      capacidad: mesa.capacidad ?? 0,
      forma: mesa.forma ?? 'cuadrada',
      estado: mesa.estado ?? 'libre',
      x: limitar(mesa.posicionX ?? 0),
      y: limitar(mesa.posicionY ?? 0),
      zonaNombre,
      folio: cuenta[0]?.folio ?? null,
      pedidoId: cuenta[0] ? String(cuenta[0].id) : null,
      totalTexto: cuenta.length > 0 ? moneda(total, ajustes) : null,
      comandas,
      anfitrion: sesionPorMesa.get(claveMesa)?.anfitrionNombre ?? null,
      rondas: cuenta.length,
      sinEnviar: sinEnviarPorMesa.get(claveMesa) ?? 0,
      porConfirmar: pendientes.length,
    }
  }

  const filtroZona = zona && zona !== 'todas' ? zona : null
  const visibles = filtroZona
    ? mesas.filter((mesa) => claveDe(mesa.zona) === filtroZona)
    : mesas

  const secciones: ZonaMapa[] = []
  for (const z of zonas) {
    const mesasZona = visibles.filter((mesa) => claveDe(mesa.zona) === String(z.id))
    if (mesasZona.length === 0) continue
    secciones.push({
      id: String(z.id),
      nombre: z.nombre ?? 'Zona',
      color: z.color ?? '#0ea5e9',
      mesas: mesasZona.map((mesa) => aMesaMapa(mesa, z.nombre ?? 'Zona')),
    })
  }

  const sinZona = visibles.filter(
    (mesa) => !zonas.some((z) => String(z.id) === claveDe(mesa.zona)),
  )
  if (sinZona.length > 0) {
    secciones.push({
      id: 'sin-zona',
      nombre: 'Sin zona asignada',
      color: '#64748b',
      mesas: sinZona.map((mesa) => aMesaMapa(mesa, 'Sin zona')),
    })
  }

  const mesasActivas = visibles.filter(
    (mesa) => mesa.activa !== false && mesa.estado !== 'fuera_servicio',
  )
  const libres = mesasActivas.filter((mesa) => mesa.estado === 'libre').length
  const ocupadas = mesasActivas.filter((mesa) => mesa.estado === 'ocupada').length
  const reservadas = mesasActivas.filter((mesa) => mesa.estado === 'reservada').length
  const limpieza = mesasActivas.filter((mesa) => mesa.estado === 'limpieza').length
  const ocupacion = mesasActivas.length > 0 ? Math.round((ocupadas / mesasActivas.length) * 100) : 0

  const opcionesZona = zonas.map((z) => ({ id: String(z.id), nombre: z.nombre ?? 'Zona' }))

  return (
    <div>
      <EncabezadoPagina
        titulo="Mapa de salón"
        descripcion="Vista operativa del piso: toca una mesa para cambiar su estado o abrir su pedido."
        icono={LayoutGrid}
      >
        <AutoRefresco />
        <FiltroZona zonas={opcionesZona} valor={filtroZona ?? 'todas'} />
      </EncabezadoPagina>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <TarjetaKpi etiqueta="Libres" valor={numero(libres)} icono={CircleCheck} acento="exito" />
        <TarjetaKpi etiqueta="Ocupadas" valor={numero(ocupadas)} icono={Users} acento="peligro" />
        <TarjetaKpi
          etiqueta="Reservadas"
          valor={numero(reservadas)}
          icono={CalendarClock}
          acento="primario"
        />
        <TarjetaKpi etiqueta="Por limpiar" valor={numero(limpieza)} icono={Sparkles} acento="aviso" />
        <TarjetaKpi
          etiqueta="Ocupación"
          valor={`${ocupacion}%`}
          detalle={`${ocupadas} de ${mesasActivas.length} mesas activas`}
          icono={Table2}
          acento="primario"
        />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-card px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Leyenda
        </span>
        {ESTADOS_MESA.map((item) => (
          <span
            key={item.estado}
            className="inline-flex items-center gap-2 text-xs text-muted-foreground"
          >
            <span className={cn('size-2.5 rounded-full', item.punto)} />
            {item.etiqueta}
          </span>
        ))}
      </div>

      {secciones.length > 0 ? (
        <MapaSalon zonas={secciones} puedeCambiarEstado={puedeCambiarEstado} />
      ) : (
        <EstadoVacio
          titulo="No hay mesas para mostrar"
          descripcion={
            filtroZona
              ? 'La zona seleccionada no tiene mesas registradas.'
              : 'Crea mesas y zonas para ver el plano del salón.'
          }
          icono={LayoutGrid}
        />
      )}
    </div>
  )
}
