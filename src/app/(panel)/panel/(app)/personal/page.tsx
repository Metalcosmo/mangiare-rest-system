import { addDays, format, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  CalendarClock,
  Clock,
  DollarSign,
  Users,
} from 'lucide-react'
import type { Metadata } from 'next'
import type { Where } from 'payload'

import { DialogoRegistro } from '@/components/panel/dialogo-registro'
import { EncabezadoPagina } from '@/components/panel/encabezado-pagina'
import type { TurnoVista } from '@/components/panel/personal/acciones-turno'
import { ListaEmpleados, type FilaEmpleado } from '@/components/panel/personal/lista-empleados'
import { NavegacionSemana } from '@/components/panel/personal/navegacion-semana'
import { TablaTurnosSemana } from '@/components/panel/personal/tabla-turnos'
import { TarjetaKpi } from '@/components/panel/tarjeta-kpi'
import { VistaSemanal, type DiaSemana } from '@/components/panel/personal/vista-semanal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { requireRol } from '@/lib/auth'
import { iniciales, moneda, numero } from '@/lib/formato'
import { obtenerOpciones } from '@/lib/opciones'
import { obtenerAjustes, getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = { title: 'Personal y turnos' }

type Busqueda = {
  tab?: string
  semana?: string
  desde?: string
  q?: string
}

/** Clave ISO (YYYY-MM-DD) en la zona horaria local del servidor. */
const claveDia = (fecha: Date): string =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(
    fecha.getDate(),
  ).padStart(2, '0')}`

/** Primer día del rango: `?desde=` explícito o `offset` semanas a partir de hoy. */
const inicioDelRango = (desde: string | undefined, offset: number): Date => {
  if (desde && /^\d{4}-\d{2}-\d{2}$/.test(desde)) {
    const [anio, mes, dia] = desde.split('-').map(Number)
    return startOfDay(new Date(anio, mes - 1, dia))
  }
  return startOfDay(addDays(new Date(), offset * 7))
}

const parteDeFecha = (empleado: { nombre?: string | null; apellidos?: string | null; email?: string }) =>
  [empleado.nombre, empleado.apellidos].filter(Boolean).join(' ') || empleado.email || 'Empleado'

/** Pestaña válida a partir de `?tab=` (evita valores arbitrarios en la URL). */
const pestanaValida = (tab?: string): string => (tab === 'turnos' ? 'turnos' : 'equipo')

export default async function PaginaPersonal({
  searchParams,
}: {
  searchParams: Promise<Busqueda>
}) {
  await requireRol('admin', 'gerente')

  const { tab = 'equipo', semana, desde } = await searchParams
  const pestana = pestanaValida(tab)
  const offset = Number.parseInt(semana ?? '0', 10) || 0

  const inicio = inicioDelRango(desde, offset)
  const fin = addDays(inicio, 6)
  const desdeIso = inicio.toISOString()
  const hastaIso = addDays(inicio, 7).toISOString()

  const payload = await getPayloadClient()

  const [ajustes, { docs: usuarios }, { docs: turnosSemana }] = await Promise.all([
    obtenerAjustes(),
    payload.find({
      collection: 'users',
      depth: 0,
      limit: 500,
      pagination: false,
      sort: 'nombre',
      overrideAccess: true,
    }),
    payload.find({
      collection: 'turnos',
      depth: 1,
      limit: 500,
      pagination: false,
      sort: 'fecha',
      where: {
        and: [{ fecha: { greater_than_equal: desdeIso } }, { fecha: { less_than: hastaIso } }],
      } as Where,
      overrideAccess: true,
    }),
  ])

  // ── Equipo ────────────────────────────────────────────────────────────────
  const empleados: FilaEmpleado[] = usuarios.map((usuario) => ({
    id: usuario.id,
    nombre: usuario.nombre ?? '',
    apellidos: usuario.apellidos ?? null,
    email: usuario.email,
    rol: usuario.rol ?? null,
    puesto: usuario.puesto ?? null,
    tarifaHora: usuario.tarifaHora ?? 0,
    activo: usuario.activo ?? false,
  }))

  const activos = empleados.filter((empleado) => empleado.activo)
  const tarifas = new Map(
    empleados.map((empleado) => [String(empleado.id), Number(empleado.tarifaHora ?? 0)]),
  )

  const horasSemana = turnosSemana.reduce(
    (total, turno) => total + Number(turno.horasTotales ?? 0),
    0,
  )
  const costoNomina = turnosSemana.reduce((total, turno) => {
    const id = typeof turno.empleado === 'object' && turno.empleado ? turno.empleado.id : turno.empleado
    return total + Number(turno.horasTotales ?? 0) * (tarifas.get(String(id)) ?? 0)
  }, 0)
  const horasActivos = turnosSemana
    .filter((turno) => {
      const id =
        typeof turno.empleado === 'object' && turno.empleado ? turno.empleado.id : turno.empleado
      return activos.some((empleado) => String(empleado.id) === String(id))
    })
    .reduce((total, turno) => total + Number(turno.horasTotales ?? 0), 0)

  // ── Semana ────────────────────────────────────────────────────────────────
  const dias: DiaSemana[] = Array.from({ length: 7 }, (_, indice) => {
    const fecha = addDays(inicio, indice)
    return {
      clave: claveDia(fecha),
      dia: format(fecha, 'EEEE', { locale: es }),
      numeroDia: fecha.getDate(),
      esHoy: claveDia(fecha) === claveDia(new Date()),
    }
  })

  const turnos: TurnoVista[] = turnosSemana.map((turno) => {
    const relacion = typeof turno.empleado === 'object' && turno.empleado ? turno.empleado : null
    const nombre = relacion ? parteDeFecha(relacion) : 'Empleado sin asignar'
    return {
      id: turno.id,
      empleadoId: relacion ? String(relacion.id) : '',
      empleadoNombre: nombre,
      iniciales: iniciales(nombre),
      fecha: String(turno.fecha ?? ''),
      horaInicio: turno.horaInicio ?? '',
      horaFin: turno.horaFin ?? '',
      horas: Number(turno.horasTotales ?? 0),
      puesto: turno.puesto ?? '',
      estado: turno.estado ?? 'programado',
      notas: turno.notas ?? null,
    }
  })

  const opcionesTurnos = await obtenerOpciones(['usuarios'])

  const etiquetaSemana = `${format(inicio, "d 'de' MMM", { locale: es })} – ${format(fin, "d 'de' MMM yyyy", { locale: es })}`

  return (
    <div>
      <EncabezadoPagina
        titulo="Personal y turnos"
        descripcion="Tu equipo, sus accesos y la programación de la semana."
        icono={Users}
      >
        <DialogoRegistro recurso="empleados" opciones={{}} etiqueta="Nuevo empleado" />
        <DialogoRegistro recurso="turnos" opciones={opcionesTurnos} etiqueta="Programar turno" />
      </EncabezadoPagina>

      <Tabs key={pestana} defaultValue={pestana}>
        <TabsList>
          <TabsTrigger value="equipo">Equipo</TabsTrigger>
          <TabsTrigger value="turnos">Turnos</TabsTrigger>
        </TabsList>

        <TabsContent value="equipo" className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <TarjetaKpi
              etiqueta="Empleados activos"
              valor={numero(activos.length)}
              detalle={`de ${numero(empleados.length)} registrados`}
              icono={Users}
              acento="primario"
            />
            <TarjetaKpi
              etiqueta="Horas programadas (semana)"
              valor={`${numero(horasSemana, horasSemana % 1 === 0 ? 0 : 2)} h`}
              detalle={`${numero(turnosSemana.length)} turnos en total`}
              icono={Clock}
              acento="aviso"
            />
            <TarjetaKpi
              etiqueta="Horas del personal activo"
              valor={`${numero(horasActivos, horasActivos % 1 === 0 ? 0 : 2)} h`}
              detalle="Excluye accesos suspendidos"
              icono={CalendarClock}
              acento="primario"
            />
            <TarjetaKpi
              etiqueta="Nómina estimada (semana)"
              valor={moneda(costoNomina, ajustes)}
              detalle="Horas × tarifa por hora"
              icono={DollarSign}
              acento="exito"
            />
          </div>

          <ListaEmpleados empleados={empleados} opciones={{}} ajustes={ajustes} />
        </TabsContent>

        <TabsContent value="turnos" className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <NavegacionSemana offset={offset} etiqueta={etiquetaSemana} />
            <DialogoRegistro
              recurso="turnos"
              opciones={opcionesTurnos}
              valores={{ fecha: dias[0]?.clave, horaInicio: '13:00', horaFin: '21:00' }}
              etiqueta="Programar turno"
            />
          </div>

          <VistaSemanal dias={dias} turnos={turnos} opciones={opcionesTurnos} />

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">
                Detalle de la semana
                <span className="ml-2 font-normal text-muted-foreground">
                  {numero(turnos.length)} turnos ·{' '}
                  {numero(horasSemana, horasSemana % 1 === 0 ? 0 : 2)} h
                </span>
              </h2>
            </div>
            <TablaTurnosSemana turnos={turnos} opciones={opcionesTurnos} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
