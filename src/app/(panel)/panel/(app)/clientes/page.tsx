import { Activity, Award, Coins, PieChart, UserPlus, Users, UsersRound, Wallet } from 'lucide-react'
import type { Metadata } from 'next'
import type { Where } from 'payload'

import { resumenSegmentos } from '@/actions/crm'
import { Buscador } from '@/components/panel/buscador'
import { FiltrosClientes } from '@/components/panel/crm/filtros-clientes'
import { ResumenLealtad } from '@/components/panel/crm/resumen-lealtad'
import { TablaClientes, type FilaCliente } from '@/components/panel/crm/tabla-clientes'
import { TabsClientes } from '@/components/panel/crm/tabs-clientes'
import { TarjetaSegmento } from '@/components/panel/crm/tarjeta-segmento'
import { DialogoRegistro } from '@/components/panel/dialogo-registro'
import { EncabezadoPagina } from '@/components/panel/encabezado-pagina'
import { EstadoVacio } from '@/components/panel/estado-vacio'
import { PaginaRecurso } from '@/components/panel/pagina-recurso'
import { TarjetaKpi } from '@/components/panel/tarjeta-kpi'
import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NIVELES } from '@/hooks/clientes'
import { requireRol } from '@/lib/auth'
import { moneda, numero } from '@/lib/formato'
import { getPayloadClient, obtenerAjustes } from '@/lib/payload'

export const metadata: Metadata = { title: 'Clientes y lealtad' }

type ParametrosBusqueda = Record<string, string | string[] | undefined>

const texto = (valor: string | string[] | undefined): string =>
  typeof valor === 'string' ? valor.trim() : ''

const DIAS_ACTIVO = 30

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<ParametrosBusqueda>
}) {
  await requireRol('admin', 'gerente', 'cajero', 'mesero')

  const parametros = await searchParams
  const q = texto(parametros.q)
  const nivel = texto(parametros.nivel)
  const etiqueta = texto(parametros.etiqueta)

  const payload = await getPayloadClient()
  const ajustes = await obtenerAjustes()

  const condiciones: Where[] = []
  if (nivel) condiciones.push({ nivel: { equals: nivel } } as Where)
  if (etiqueta) condiciones.push({ etiquetas: { contains: etiqueta } } as Where)
  if (q) {
    condiciones.push({
      or: [
        { nombre: { like: q } },
        { telefono: { like: q } },
        { email: { like: q } },
      ],
    })
  }

  const [todos, filtrados, segmentos] = await Promise.all([
    payload.find({
      collection: 'clientes',
      depth: 0,
      limit: 1000,
      pagination: false,
      sort: '-totalGastado',
      overrideAccess: true,
    }),
    payload.find({
      collection: 'clientes',
      depth: 0,
      limit: 300,
      pagination: false,
      sort: '-totalGastado',
      where: condiciones.length > 0 ? ({ and: condiciones } as Where) : undefined,
      overrideAccess: true,
    }),
    resumenSegmentos(),
  ])

  const docs = todos.docs

  // KPIs de la cartera completa.
  const total = docs.length
  const inicioMes = new Date()
  inicioMes.setDate(1)
  inicioMes.setHours(0, 0, 0, 0)
  const nuevosDelMes = docs.filter(
    (doc) => doc.createdAt && new Date(doc.createdAt) >= inicioMes,
  ).length
  const puntosOtorgados = docs.reduce((suma, doc) => suma + Number(doc.puntos ?? 0), 0)
  const gastoAcumulado = docs.reduce((suma, doc) => suma + Number(doc.totalGastado ?? 0), 0)
  const valorPromedio = total > 0 ? gastoAcumulado / total : 0
  const limiteActivos = new Date(Date.now() - DIAS_ACTIVO * 24 * 60 * 60 * 1000)
  const activos = docs.filter(
    (doc) => doc.ultimaVisita && new Date(doc.ultimaVisita) >= limiteActivos,
  ).length

  // Distribución por nivel para la pestaña de lealtad.
  const conteos: Record<string, number> = {}
  for (const escalon of NIVELES) conteos[escalon.value] = 0
  for (const doc of docs) {
    const clave = doc.nivel ?? 'bronce'
    conteos[clave] = (conteos[clave] ?? 0) + 1
  }

  const hayFiltros = Boolean(q || nivel || etiqueta)
  const sinClientes = total === 0

  return (
    <div>
      <EncabezadoPagina
        titulo="Clientes y lealtad"
        descripcion="Cartera de clientes, programa de puntos y segmentos de fidelización."
        icono={UsersRound}
      />

      <TabsClientes>
        <TabsList>
          <TabsTrigger value="clientes">
            <Users className="size-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="lealtad">
            <Award className="size-4" />
            Lealtad
          </TabsTrigger>
          <TabsTrigger value="segmentos">
            <PieChart className="size-4" />
            Segmentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clientes" className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <TarjetaKpi
              etiqueta="Clientes"
              valor={numero(total)}
              detalle="en la cartera"
              icono={UsersRound}
            />
            <TarjetaKpi
              etiqueta="Nuevos del mes"
              valor={numero(nuevosDelMes)}
              detalle="altas este mes"
              icono={UserPlus}
              acento="exito"
            />
            <TarjetaKpi
              etiqueta="Puntos otorgados"
              valor={numero(puntosOtorgados)}
              detalle="saldo acumulado"
              icono={Coins}
              acento="aviso"
            />
            <TarjetaKpi
              etiqueta="Valor por cliente"
              valor={moneda(valorPromedio, ajustes)}
              detalle="gasto promedio"
              icono={Wallet}
            />
            <TarjetaKpi
              etiqueta={`Activos (${DIAS_ACTIVO} días)`}
              valor={numero(activos)}
              detalle="con visita reciente"
              icono={Activity}
              acento="exito"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Buscador placeholder="Buscar por nombre, teléfono o correo…" />
            <FiltrosClientes niveles={NIVELES.map(({ label, value }) => ({ label, value }))} />
            <div className="ms-auto">
              <DialogoRegistro recurso="clientes" opciones={{}} etiqueta="Nuevo cliente" />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs text-muted-foreground">
              {numero(filtrados.docs.length)} de {numero(total)} clientes
              {hayFiltros ? ' (filtrados)' : ''}
            </p>

            {sinClientes ? (
              <EstadoVacio
                titulo="Aún no hay clientes"
                descripcion="Registra al primer cliente para empezar a acumular puntos, visitas y recompensas."
                icono={UsersRound}
              >
                <DialogoRegistro recurso="clientes" opciones={{}} etiqueta="Nuevo cliente" />
              </EstadoVacio>
            ) : (
              <TablaClientes
                filas={filtrados.docs as unknown as FilaCliente[]}
                ajustes={ajustes}
                mensajeVacio="Ningún cliente coincide con la búsqueda o los filtros."
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="lealtad" className="flex flex-col gap-6">
          <ResumenLealtad ajustes={ajustes} conteos={conteos} total={total} />

          <PaginaRecurso
            recurso="recompensas"
            titulo="Catálogo de recompensas"
            descripcion="Define qué puede canjear un cliente con sus puntos."
            mensajeVacio={{
              titulo: 'Sin recompensas todavía',
              descripcion: 'Crea la primera recompensa para que los clientes puedan canjear.',
            }}
          />
        </TabsContent>

        <TabsContent value="segmentos" className="flex flex-col gap-6">
          <p className="max-w-3xl text-sm text-muted-foreground">
            Segmentos calculados automáticamente a partir de las visitas, los puntos y el perfil
            de cada cliente. Úsalos para dirigir campañas y promociones.
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {segmentos.map((segmento) => (
              <TarjetaSegmento key={segmento.clave} segmento={segmento} />
            ))}
          </div>
        </TabsContent>
      </TabsClientes>
    </div>
  )
}
