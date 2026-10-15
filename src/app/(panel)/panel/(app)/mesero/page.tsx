import { BellRing, HandPlatter, Receipt, Users } from 'lucide-react'
import type { Metadata } from 'next'
import type { Where } from 'payload'

import { AutoRefresco } from '@/components/panel/auto-refresco'
import { EncabezadoPagina } from '@/components/panel/encabezado-pagina'
import {
  ColaAprobacion,
  type PedidoPorConfirmar,
} from '@/components/panel/mesero/cola-aprobacion'
import { FiltroVistas, type MesaFiltro, type ZonaFiltro } from '@/components/panel/mesero/filtro-vistas'
import { ListaMesas, type MesaVista } from '@/components/panel/mesero/lista-mesas'
import { TarjetaKpi } from '@/components/panel/tarjeta-kpi'
import { requireRol } from '@/lib/auth'
import { hora, moneda, numero } from '@/lib/formato'
import { claveDe } from '@/lib/ids'
import { getPayloadClient, obtenerAjustes } from '@/lib/payload'
import { ESTADOS_ACTIVOS } from '@/lib/pedidos'

export const metadata: Metadata = {
  title: 'Mi servicio',
  description: 'Tus mesas, los pedidos por confirmar y la toma de pedido',
}

type SesionCruda = {
  id: number | string
  mesa?: unknown
  anfitrionNombre?: string | null
  estado?: string | null
}

type BorradorCrudo = {
  id: number | string
  mesa?: unknown
  items?: Array<{ cantidad?: number | null }> | null
}

type Busqueda = {
  vista?: string
  zona?: string
  mesas?: string
  q?: string
}

type ZonaCruda = { id: number | string; nombre?: string | null }
type MesaCruda = {
  id: number | string
  nombre?: string | null
  capacidad?: number | null
  estado?: string | null
  activa?: boolean | null
  zona?: unknown
}

type ItemCrudo = {
  nombre?: string | null
  cantidad?: number | null
  notas?: string | null
  modificadores?: Array<{ nombre?: string | null }> | null
}

type PedidoCrudo = {
  id: number | string
  folio?: string | null
  estado?: string | null
  ronda?: number | null
  total?: number | null
  comensales?: number | null
  clienteNombre?: string | null
  notas?: string | null
  createdAt?: string | null
  mesa?: unknown
  mesero?: unknown
  items?: ItemCrudo[] | null
}

export default async function PaginaMesero({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const usuario = await requireRol('admin', 'gerente', 'cajero', 'mesero')

  const filtros = await searchParams
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
      where: { activa: { equals: true } } as Where,
      depth: 1,
      limit: 300,
      pagination: false,
      sort: 'nombre',
      overrideAccess: true,
    }),
    payload.find({
      collection: 'pedidos',
      where: { estado: { in: ESTADOS_ACTIVOS } } as Where,
      depth: 1,
      limit: 300,
      pagination: false,
      sort: 'createdAt',
      overrideAccess: true,
    }),
    payload.find({
      collection: 'sesiones-mesa',
      where: { estado: { equals: 'abierta' } } as Where,
      depth: 0,
      limit: 300,
      pagination: false,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'pedidos',
      where: { estado: { equals: 'borrador' } } as Where,
      depth: 0,
      limit: 300,
      pagination: false,
      overrideAccess: true,
    }),
  ])

  const zonas = zonasRes.docs as unknown as ZonaCruda[]
  const mesas = mesasRes.docs as unknown as MesaCruda[]
  const pedidos = pedidosRes.docs as unknown as PedidoCrudo[]
  const sesiones = sesionesRes.docs as unknown as SesionCruda[]
  const borradores = borradoresRes.docs as unknown as BorradorCrudo[]

  // La sesión abierta es la que le pone nombre a la cuenta de la mesa.
  const sesionPorMesa = new Map<string, SesionCruda>()
  for (const sesion of sesiones) {
    const clave = claveDe(sesion.mesa)
    if (clave) sesionPorMesa.set(clave, sesion)
  }

  // Platillos que la mesa armó y todavía no manda al mesero.
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

  const miId = claveDe(usuario.id)

  // ── Pedidos agrupados por mesa ────────────────────────────────────────────
  const porMesa = new Map<string, PedidoCrudo[]>()
  for (const pedido of pedidos) {
    const clave = claveDe(pedido.mesa)
    if (!clave) continue
    porMesa.set(clave, [...(porMesa.get(clave) ?? []), pedido])
  }

  /** Nombre de la zona de una mesa, tolerando la relación poblada o suelta. */
  const zonaDe = (mesa: MesaCruda): string => {
    if (mesa.zona && typeof mesa.zona === 'object') {
      return (mesa.zona as { nombre?: string }).nombre ?? 'Sin zona'
    }
    const encontrada = zonas.find((z) => String(z.id) === claveDe(mesa.zona))
    return encontrada?.nombre ?? 'Sin zona'
  }

  const aVista = (mesa: MesaCruda): MesaVista => {
    const clave = String(mesa.id)
    const todos = porMesa.get(clave) ?? []
    const pendientes = todos.filter((pedido) => pedido.estado === 'por_confirmar')
    // La cuenta abierta son sólo los pedidos ya aprobados: lo pendiente
    // todavía no es una cuenta.
    const cuenta = todos.filter((pedido) => pedido.estado !== 'por_confirmar')
    const total = cuenta.reduce((suma, pedido) => suma + (pedido.total ?? 0), 0)
    const sesion = sesionPorMesa.get(clave)

    return {
      id: clave,
      nombre: mesa.nombre ?? 'Mesa',
      zona: zonaDe(mesa),
      capacidad: mesa.capacidad ?? 0,
      estado: mesa.estado ?? 'libre',
      folio: cuenta[0]?.folio ?? null,
      pedidoId: cuenta[0] ? String(cuenta[0].id) : null,
      totalTexto: cuenta.length > 0 ? moneda(total, ajustes) : null,
      comandas: cuenta.reduce((suma, pedido) => suma + (pedido.items?.length ?? 0), 0),
      anfitrion: sesion?.anfitrionNombre ?? null,
      rondas: cuenta.length,
      sinEnviar: sinEnviarPorMesa.get(clave) ?? 0,
      porConfirmar: pendientes.length,
    }
  }

  const vistas = mesas.map(aVista)
  const porMesaVista = new Map(vistas.map((mesa) => [mesa.id, mesa]))

  /** ¿El mesero actual tiene algún pedido activo en esta mesa? */
  const esMia = (mesaId: string): boolean =>
    (porMesa.get(mesaId) ?? []).some((pedido) => claveDe(pedido.mesero) === miId)

  // ── Filtros ───────────────────────────────────────────────────────────────
  const vista = filtros.vista ?? 'todas'
  const filtroZona = filtros.zona && filtros.zona !== 'todas' ? filtros.zona : null
  const seleccion = (filtros.mesas ?? '').split(',').filter(Boolean)
  const termino = (filtros.q ?? '').trim().toLowerCase()

  const coincideBusqueda = (mesa: MesaVista): boolean =>
    !termino ||
    mesa.nombre.toLowerCase().includes(termino) ||
    mesa.zona.toLowerCase().includes(termino)

  const visibles = vistas
    .filter((mesa) => {
      if (filtroZona) {
        const cruda = mesas.find((m) => String(m.id) === mesa.id)
        if (!cruda || claveDe(cruda.zona) !== filtroZona) return false
      }
      if (vista === 'mis' && !esMia(mesa.id)) return false
      if (vista === 'seleccion' && !seleccion.includes(mesa.id)) return false
      if (vista === 'confirmar' && mesa.porConfirmar === 0) return false
      if (vista === 'libres' && mesa.estado !== 'libre') return false
      if (vista === 'ocupadas' && mesa.estado !== 'ocupada') return false
      return coincideBusqueda(mesa)
    })
    .sort((a, b) => {
      // Primero lo que exige atención, luego por nombre.
      if (a.porConfirmar !== b.porConfirmar) return b.porConfirmar - a.porConfirmar
      return a.nombre.localeCompare(b.nombre, 'es')
    })

  // ── Cola de aprobación ────────────────────────────────────────────────────
  const cola: PedidoPorConfirmar[] = pedidos
    .filter((pedido) => pedido.estado === 'por_confirmar')
    .filter((pedido) => {
      if (filtroZona && claveDe(pedido.mesa) !== '') {
        const cruda = mesas.find((m) => String(m.id) === claveDe(pedido.mesa))
        if (!cruda || claveDe(cruda.zona) !== filtroZona) return false
      }
      if (!termino) return true
      const mesa = porMesaVista.get(claveDe(pedido.mesa))
      return (
        (mesa?.nombre ?? '').toLowerCase().includes(termino) ||
        (pedido.folio ?? '').toLowerCase().includes(termino) ||
        (pedido.clienteNombre ?? '').toLowerCase().includes(termino)
      )
    })
    .map((pedido) => {
      const mesa = porMesaVista.get(claveDe(pedido.mesa))
      return {
        id: String(pedido.id),
        folio: pedido.folio ?? '—',
        mesa: mesa?.nombre ?? null,
        zona: mesa?.zona && mesa.zona !== 'Sin zona' ? mesa.zona : null,
        anfitrion: sesionPorMesa.get(claveDe(pedido.mesa))?.anfitrionNombre ?? null,
        ronda: pedido.ronda ?? null,
        comensales: pedido.comensales ?? 1,
        clienteNombre: pedido.clienteNombre ?? null,
        horaTexto: hora(pedido.createdAt),
        totalTexto: moneda(pedido.total ?? 0, ajustes),
        notas: pedido.notas ?? null,
        items: (pedido.items ?? []).map((item) => ({
          nombre: item.nombre ?? 'Platillo',
          cantidad: item.cantidad ?? 1,
          modificadores: (item.modificadores ?? [])
            .map((mod) => mod.nombre ?? '')
            .filter(Boolean),
          notas: item.notas ?? null,
        })),
      }
    })

  // ── Indicadores ───────────────────────────────────────────────────────────
  const misMesas = vistas.filter((mesa) => esMia(mesa.id)).length
  const ocupadas = vistas.filter((mesa) => mesa.estado === 'ocupada').length
  const libres = vistas.filter((mesa) => mesa.estado === 'libre').length
  const cuentas = vistas.filter((mesa) => mesa.pedidoId).length

  const opcionesZona: ZonaFiltro[] = zonas.map((zona) => ({
    id: String(zona.id),
    nombre: zona.nombre ?? 'Zona',
  }))

  const opcionesMesa: MesaFiltro[] = vistas.map((mesa) => ({
    id: mesa.id,
    nombre: mesa.nombre,
    zona: mesa.zona,
  }))

  return (
    <div>
      <EncabezadoPagina
        titulo="Mi servicio"
        descripcion="Confirma lo que piden tus mesas, toma pedidos y sigue tus cuentas abiertas."
        icono={HandPlatter}
      >
        <AutoRefresco />
      </EncabezadoPagina>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <TarjetaKpi
          etiqueta="Por confirmar"
          valor={numero(cola.length)}
          detalle={cola.length === 0 ? 'Todo al día' : 'Esperando tu aprobación'}
          icono={BellRing}
          acento={cola.length > 0 ? 'aviso' : 'exito'}
        />
        <TarjetaKpi etiqueta="Mis mesas" valor={numero(misMesas)} icono={Users} />
        <TarjetaKpi
          etiqueta="Cuentas abiertas"
          valor={numero(cuentas)}
          detalle={`${libres} libres · ${ocupadas} ocupadas`}
          icono={Receipt}
        />
        <TarjetaKpi
          etiqueta="Mesas activas"
          valor={numero(vistas.length)}
          detalle="Con el filtro actual"
          icono={HandPlatter}
        />
      </div>

      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Pedidos por confirmar
          </h2>
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
            {cola.length}
          </span>
        </div>
        <ColaAprobacion pedidos={cola} />
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Mesas
          </h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {visibles.length} de {vistas.length}
          </span>
        </div>

        <FiltroVistas zonas={opcionesZona} mesas={opcionesMesa} />
        <ListaMesas mesas={visibles} />
      </section>
    </div>
  )
}
