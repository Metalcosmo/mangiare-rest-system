import { ArrowLeft, Package, Plus, UtensilsCrossed, Wand2 } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { BotonEliminarGrupo } from '@/components/panel/carta/boton-eliminar-grupo'
import { EncabezadoPagina } from '@/components/panel/encabezado-pagina'
import { EtiquetaEstado } from '@/components/panel/etiqueta-estado'
import { TarjetaKpi } from '@/components/panel/tarjeta-kpi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { requireRol } from '@/lib/auth'
import { gruposDe } from '@/lib/carta'
import { moneda, numero } from '@/lib/formato'
import { claveDe } from '@/lib/ids'
import { getPayloadClient, obtenerAjustes } from '@/lib/payload'

export const metadata: Metadata = { title: 'Opciones y modificadores' }

type GrupoCrudo = {
  id: number | string
  nombre?: string | null
  descripcion?: string | null
  tipo?: string | null
  obligatorio?: boolean | null
  minSelecciones?: number | null
  maxSelecciones?: number | null
  opciones?: unknown
}

type ProductoCrudo = {
  id: number | string
  nombre?: string | null
  gruposModificadores?: unknown
}

export default async function PaginaGrupos() {
  await requireRol('admin', 'gerente')

  const payload = await getPayloadClient()

  const [ajustes, gruposRes, productosRes] = await Promise.all([
    obtenerAjustes(),
    payload.find({
      collection: 'grupos-modificadores',
      depth: 1,
      limit: 200,
      pagination: false,
      sort: 'nombre',
      overrideAccess: true,
    }),
    payload.find({
      collection: 'productos',
      depth: 0,
      limit: 0,
      pagination: false,
      overrideAccess: true,
    }),
  ])

  const grupos = gruposRes.docs as unknown as GrupoCrudo[]
  const productos = productosRes.docs as unknown as ProductoCrudo[]

  // Cuántos platillos usan cada grupo: es lo que impide borrarlo sin querer.
  const usos = new Map<string, number>()
  for (const producto of productos) {
    const asignados = Array.isArray(producto.gruposModificadores)
      ? producto.gruposModificadores
      : []
    for (const id of asignados) {
      const clave = claveDe(id)
      usos.set(clave, (usos.get(clave) ?? 0) + 1)
    }
  }

  const filas = grupos.map((grupo) => {
    const opciones = gruposDe([grupo])[0]?.opciones ?? []
    const disponibles = opciones.filter((opcion) => opcion.disponible !== false)
    const precios = opciones.map((opcion) => opcion.precioExtra)
    const usados = usos.get(String(grupo.id)) ?? 0

    return {
      id: String(grupo.id),
      nombre: grupo.nombre ?? 'Grupo',
      descripcion: grupo.descripcion ?? null,
      tipo: grupo.tipo === 'multiple' ? 'multiple' : 'unica',
      obligatorio: Boolean(grupo.obligatorio),
      maxSelecciones: grupo.maxSelecciones ?? 1,
      opciones,
      disponibles: disponibles.length,
      agotadas: opciones.length - disponibles.length,
      minimo: precios.length > 0 ? Math.min(...precios) : 0,
      maximo: precios.length > 0 ? Math.max(...precios) : 0,
      usados,
    }
  })

  const conOpcionesAgotadas = filas.filter((fila) => fila.agotadas > 0).length
  const sinUso = filas.filter((fila) => fila.usados === 0).length
  const encarecimiento = filas.reduce((maximo, fila) => Math.max(maximo, fila.maximo), 0)

  return (
    <div>
      <EncabezadoPagina
        titulo="Opciones y modificadores"
        descripcion="Tallas, extras y términos de cocción. Cada grupo se asigna a un platillo desde su editor y puede subir el precio."
        icono={Wand2}
      >
        <Button asChild variant="outline">
          <Link href="/panel/carta">
            <ArrowLeft className="size-4" />
            Volver a la carta
          </Link>
        </Button>
        <Button asChild>
          <Link href="/panel/carta/grupos/nuevo">
            <Plus className="size-4" />
            Nuevo grupo
          </Link>
        </Button>
      </EncabezadoPagina>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaKpi etiqueta="Grupos" valor={numero(filas.length)} icono={Wand2} />
        <TarjetaKpi
          etiqueta="Usados en platillos"
          valor={numero(filas.length - sinUso)}
          detalle={sinUso > 0 ? `${sinUso} sin asignar` : 'Todos en uso'}
          icono={UtensilsCrossed}
          acento={sinUso > 0 ? 'aviso' : 'exito'}
        />
        <TarjetaKpi
          etiqueta="Con opciones agotadas"
          valor={numero(conOpcionesAgotadas)}
          detalle="Se ocultan de la carta"
          icono={Package}
          acento={conOpcionesAgotadas > 0 ? 'aviso' : 'exito'}
        />
        <TarjetaKpi
          etiqueta="Encarecimiento máximo"
          valor={moneda(encarecimiento, ajustes)}
          detalle="Del grupo más caro"
          icono={Wand2}
        />
      </div>

      {filas.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Wand2 className="size-6" />
            </span>
            <div>
              <p className="font-medium">Todavía no hay grupos de opciones</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Crea uno para ofrecer tallas —chica, mediana, grande— o extras que suban el precio.
              </p>
            </div>
            <Button asChild className="mt-2">
              <Link href="/panel/carta/grupos/nuevo">
                <Plus className="size-4" />
                Crear el primero
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grupo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Opciones</TableHead>
                <TableHead>Puede sumar</TableHead>
                <TableHead>Usado en</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((fila) => (
                <TableRow key={fila.id}>
                  <TableCell>
                    <Link
                      href={`/panel/carta/grupos/${fila.id}`}
                      className="font-medium hover:underline"
                    >
                      {fila.nombre}
                    </Link>
                    {fila.descripcion && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {fila.descripcion}
                      </p>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <EtiquetaEstado
                        valor={fila.tipo}
                        tono={fila.tipo === 'multiple' ? 'info' : 'morado'}
                        etiqueta={fila.tipo === 'multiple' ? 'Múltiple' : 'Única'}
                      />
                      {fila.obligatorio && (
                        <span className="text-xs text-muted-foreground">Obligatorio</span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary">{fila.opciones.length}</Badge>
                      {fila.agotadas > 0 && (
                        <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-300">
                          {fila.agotadas} agotada{fila.agotadas === 1 ? '' : 's'}
                        </Badge>
                      )}
                    </div>
                    {fila.tipo === 'multiple' && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Hasta {fila.maxSelecciones}
                      </p>
                    )}
                  </TableCell>

                  <TableCell className="tabular-nums">
                    {fila.minimo === fila.maximo
                      ? moneda(fila.maximo, ajustes)
                      : `${moneda(fila.minimo, ajustes)} – ${moneda(fila.maximo, ajustes)}`}
                  </TableCell>

                  <TableCell>
                    {fila.usados === 0 ? (
                      <span className="text-xs text-muted-foreground">Sin asignar</span>
                    ) : (
                      <span className="text-sm">
                        {fila.usados} {fila.usados === 1 ? 'platillo' : 'platillos'}
                      </span>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/panel/carta/grupos/${fila.id}`}>Editar</Link>
                      </Button>
                      <BotonEliminarGrupo id={fila.id} nombre={fila.nombre} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
