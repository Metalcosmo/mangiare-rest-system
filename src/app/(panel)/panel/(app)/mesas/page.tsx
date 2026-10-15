import { CircleCheck, Map as IconoZona, Printer, QrCode, Table2, Users } from 'lucide-react'
import Link from 'next/link'

import { Buscador } from '@/components/panel/buscador'
import { DialogoRegistro } from '@/components/panel/dialogo-registro'
import { EncabezadoPagina } from '@/components/panel/encabezado-pagina'
import { PaginaRecurso } from '@/components/panel/pagina-recurso'
import { DialogoQr } from '@/components/panel/salon/dialogo-qr'
import { TablaRecursos, type Fila } from '@/components/panel/tabla-recursos'
import { TarjetaKpi } from '@/components/panel/tarjeta-kpi'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { requireRol } from '@/lib/auth'
import { numero } from '@/lib/formato'
import { obtenerOpciones } from '@/lib/opciones'
import { getPayloadClient, obtenerAjustes } from '@/lib/payload'

export const metadata = {
  title: 'Mesas y códigos QR',
  description: 'Mesas, zonas y códigos QR de la carta digital',
}

type MesaCruda = {
  id: number | string
  nombre?: string | null
  slug?: string | null
  capacidad?: number | null
  estado?: string | null
  activa?: boolean | null
  zona?: unknown
}

/** Búsqueda sin acentos ni mayúsculas. */
const normalizar = (valor: unknown): string =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

type Props = {
  searchParams: Promise<{ q?: string }>
}

export default async function PaginaMesas({ searchParams }: Props) {
  await requireRol('admin', 'gerente', 'mesero', 'cajero')

  const { q } = await searchParams

  const payload = await getPayloadClient()
  const [mesasRes, opciones, ajustes] = await Promise.all([
    payload.find({
      collection: 'mesas',
      depth: 1,
      limit: 300,
      pagination: false,
      sort: 'nombre',
      overrideAccess: true,
    }),
    obtenerOpciones(['zonas']),
    obtenerAjustes(),
  ])

  const mesas = mesasRes.docs as unknown as MesaCruda[]

  // La búsqueda se resuelve en memoria para no depender de campos opcionales.
  const termino = normalizar((q ?? '').trim())
  const filas = termino
    ? mesas.filter(
        (mesa) =>
          normalizar(mesa.nombre).includes(termino) || normalizar(mesa.slug).includes(termino),
      )
    : mesas

  const activas = mesas.filter((mesa) => mesa.activa !== false)
  const capacidadTotal = activas.reduce((suma, mesa) => suma + (mesa.capacidad ?? 0), 0)
  const conSlug = mesas.filter((mesa) => Boolean(mesa.slug)).length

  return (
    <div>
      <EncabezadoPagina
        titulo="Mesas y códigos QR"
        descripcion="Administra las mesas y sus zonas, y genera los códigos QR de la carta digital."
        icono={Table2}
      >
        <Button asChild variant="outline">
          <Link href="/panel/imprimir-qr" target="_blank">
            <Printer className="size-4" />
            Imprimir hoja de QR
          </Link>
        </Button>
      </EncabezadoPagina>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <TarjetaKpi
          etiqueta="Mesas"
          valor={numero(mesas.length)}
          detalle={`${activas.length} activas`}
          icono={Table2}
          acento="primario"
        />
        <TarjetaKpi
          etiqueta="Capacidad del salón"
          valor={`${numero(capacidadTotal)} pers.`}
          detalle="Suma de mesas activas"
          icono={Users}
          acento="exito"
        />
        <TarjetaKpi
          etiqueta="Con slug de QR"
          valor={numero(conSlug)}
          detalle={
            conSlug < mesas.length
              ? `${mesas.length - conSlug} sin configurar`
              : 'Todas configuradas'
          }
          icono={QrCode}
          acento={conSlug === mesas.length && mesas.length > 0 ? 'exito' : 'aviso'}
        />
        <TarjetaKpi
          etiqueta="Zonas con mesas"
          valor={numero(new Set(mesas.map((mesa) => String(mesa.zona ?? '')).filter(Boolean)).size)}
          detalle="Agrupaciones del mapa"
          icono={IconoZona}
          acento="primario"
        />
      </div>

      <Tabs defaultValue="mesas" className="gap-6">
        <TabsList>
          <TabsTrigger value="mesas">
            <Table2 className="size-4" />
            Mesas
          </TabsTrigger>
          <TabsTrigger value="zonas">
            <IconoZona className="size-4" />
            Zonas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mesas" className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Listado de mesas</h2>
              <p className="text-sm text-muted-foreground">
                El botón QR de cada fila abre su código imprimible.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Buscador placeholder="Buscar por nombre o slug…" />
              <DialogoRegistro recurso="mesas" opciones={opciones} etiqueta="Nueva mesa" />
            </div>
          </div>

          <TablaRecursos
            recurso="mesas"
            filas={filas as unknown as Fila[]}
            opciones={opciones}
            ajustes={ajustes}
            mensajeVacio={{
              titulo: 'Sin mesas con los filtros actuales.',
              descripcion: 'Prueba con otro término de búsqueda.',
            }}
            onRowClick={(fila) => (
              <DialogoQr
                mesaId={String(fila.id)}
                nombre={String((fila as { nombre?: unknown }).nombre ?? 'Mesa')}
                slugConfigurado={Boolean((fila as { slug?: unknown }).slug)}
              />
            )}
          />
        </TabsContent>

        <TabsContent value="zonas">
          <PaginaRecurso
            recurso="zonas"
            titulo="Zonas del salón"
            descripcion="Cada zona agrupa las mesas que aparecen juntas en el mapa del salón."
            icono={IconoZona}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
