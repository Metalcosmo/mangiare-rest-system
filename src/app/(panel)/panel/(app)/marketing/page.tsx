import { CircleDollarSign, Megaphone, MessageSquare, MousePointerClick, Send } from 'lucide-react'
import type { Metadata } from 'next'
import type { Where } from 'payload'

import { DialogoRegistro } from '@/components/panel/dialogo-registro'
import { Buscador } from '@/components/panel/buscador'
import { EncabezadoPagina } from '@/components/panel/encabezado-pagina'
import { TablaCampanas, type FilaCampana } from '@/components/panel/marketing/tabla-campanas'
import { TablaCupones, type FilaCupon } from '@/components/panel/marketing/tabla-cupones'
import { TarjetaKpi } from '@/components/panel/tarjeta-kpi'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { requireRol } from '@/lib/auth'
import { moneda, numero, porcentaje } from '@/lib/formato'
import { obtenerOpciones } from '@/lib/opciones'
import { obtenerAjustes, getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = { title: 'Marketing' }

type Busqueda = {
  tab?: string
  q?: string
}

const idDeRelacion = (valor: unknown): string | null => {
  if (!valor) return null
  if (typeof valor === 'object') {
    const id = (valor as { id?: string | number }).id
    return id === undefined || id === null ? null : String(id)
  }
  return String(valor)
}

/** Pestaña válida a partir de `?tab=` (evita valores arbitrarios en la URL). */
const pestanaValida = (tab?: string): string =>
  tab === 'cupones' ? 'cupones' : 'campanas'

export default async function PaginaMarketing({
  searchParams,
}: {
  searchParams: Promise<Busqueda>
}) {
  await requireRol('admin', 'gerente')

  const { tab = 'campanas', q } = await searchParams
  const pestana = pestanaValida(tab)

  const payload = await getPayloadClient()

  const [ajustes, { docs: campanasDocs }, opcionesCampanas, opcionesCupones] = await Promise.all([
    obtenerAjustes(),
    payload.find({
      collection: 'campanas',
      depth: 1,
      limit: 200,
      pagination: false,
      sort: '-createdAt',
      overrideAccess: true,
    }),
    obtenerOpciones(['cupones']),
    obtenerOpciones([]),
  ])

  const cuponesWhere: Where | undefined = q
    ? {
        or: [{ codigo: { like: q } }, { descripcion: { like: q } }],
      }
    : undefined

  const { docs: cuponesDocs } = await payload.find({
    collection: 'cupones',
    depth: 0,
    limit: 200,
    pagination: false,
    sort: '-createdAt',
    where: cuponesWhere,
    overrideAccess: true,
  })

  const campanas: FilaCampana[] = campanasDocs.map((campana) => ({
    id: campana.id,
    nombre: campana.nombre,
    canal: campana.canal,
    segmento: campana.segmento,
    estado: campana.estado,
    asunto: campana.asunto ?? null,
    mensaje: campana.mensaje ?? null,
    cuponId: idDeRelacion(campana.cupon),
    programadaPara: campana.programadaPara ?? null,
    enviados: Number(campana.enviados ?? 0),
    aperturas: Number(campana.aperturas ?? 0),
    clics: Number(campana.clics ?? 0),
    conversiones: Number(campana.conversiones ?? 0),
    ingresosGenerados: Number(campana.ingresosGenerados ?? 0),
  }))

  const cupones: FilaCupon[] = cuponesDocs.map((cupon) => ({
    id: cupon.id,
    codigo: cupon.codigo,
    descripcion: cupon.descripcion ?? null,
    tipo: cupon.tipo,
    valor: Number(cupon.valor ?? 0),
    minimoCompra: Number(cupon.minimoCompra ?? 0),
    usosMaximos: Number(cupon.usosMaximos ?? 0),
    usosActuales: Number(cupon.usosActuales ?? 0),
    validoDesde: cupon.validoDesde ?? null,
    validoHasta: cupon.validoHasta ?? null,
    activo: cupon.activo ?? false,
  }))

  // ── KPIs de campañas ──────────────────────────────────────────────────────
  const enviadas = campanas.filter((campana) => campana.estado === 'enviada')
  const totalEnviados = campanas.reduce((total, campana) => total + campana.enviados, 0)
  const totalAperturas = campanas.reduce((total, campana) => total + campana.aperturas, 0)
  const totalConversiones = campanas.reduce((total, campana) => total + campana.conversiones, 0)
  const ingresos = campanas.reduce((total, campana) => total + campana.ingresosGenerados, 0)

  const tasaApertura = totalEnviados ? totalAperturas / totalEnviados : 0
  const tasaConversion = totalEnviados ? totalConversiones / totalEnviados : 0

  const cuponesActivos = cupones.filter((cupon) => cupon.activo).length

  return (
    <div>
      <EncabezadoPagina
        titulo="Marketing"
        descripcion="Campañas segmentadas, cupones de descuento y resultados de tus promociones."
        icono={Megaphone}
      >
        <DialogoRegistro
          recurso="campanas"
          opciones={opcionesCampanas}
          etiqueta="Nueva campaña"
        />
      </EncabezadoPagina>

      <Tabs key={pestana} defaultValue={pestana}>
        <TabsList>
          <TabsTrigger value="campanas">Campañas</TabsTrigger>
          <TabsTrigger value="cupones">Cupones</TabsTrigger>
        </TabsList>

        <TabsContent value="campanas" className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <TarjetaKpi
              etiqueta="Campañas enviadas"
              valor={numero(enviadas.length)}
              detalle={`de ${numero(campanas.length)} creadas`}
              icono={Send}
              acento="primario"
            />
            <TarjetaKpi
              etiqueta="Envíos totales"
              valor={numero(totalEnviados)}
              detalle="Mensajes registrados"
              icono={MessageSquare}
              acento="primario"
            />
            <TarjetaKpi
              etiqueta="Tasa de apertura"
              valor={totalEnviados ? porcentaje(tasaApertura) : '—'}
              detalle={`${numero(totalAperturas)} aperturas`}
              icono={MousePointerClick}
              acento="aviso"
            />
            <TarjetaKpi
              etiqueta="Tasa de conversión"
              valor={totalEnviados ? porcentaje(tasaConversion) : '—'}
              detalle={`${numero(totalConversiones)} conversiones`}
              icono={MousePointerClick}
              acento="exito"
            />
            <TarjetaKpi
              etiqueta="Ingresos atribuidos"
              valor={moneda(ingresos, ajustes)}
              detalle="Ventas generadas por campañas"
              icono={CircleDollarSign}
              acento="exito"
            />
          </div>

          <Alert>
            <Send className="size-4" />
            <AlertTitle>El envío se registra, no se transmite</AlertTitle>
            <AlertDescription>
              El sistema deja constancia de cada campaña y su audiencia, pero no envía correos ni
              mensajes. El envío real se conecta con tu proveedor de correo o SMS.
            </AlertDescription>
          </Alert>

          <TablaCampanas campanas={campanas} opciones={opcionesCampanas} ajustes={ajustes} />
        </TabsContent>

        <TabsContent value="cupones" className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Buscador placeholder="Buscar cupones por código o descripción…" />
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {numero(cupones.length)} {cupones.length === 1 ? 'cupón' : 'cupones'}
                <span className="mx-2 text-border">·</span>
                {numero(cuponesActivos)} activos
              </span>
            </div>
            <DialogoRegistro recurso="cupones" opciones={opcionesCupones} etiqueta="Nuevo cupón" />
          </div>

          <TablaCupones
            cupones={cupones}
            opciones={opcionesCupones}
            ajustes={ajustes}
            busqueda={q}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
