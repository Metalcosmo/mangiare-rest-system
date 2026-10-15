'use client'

import { Loader2, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { toast } from 'sonner'

import { marcarCampanaEnviada } from '@/actions/marketing'
import { BotonEliminar } from '@/components/panel/boton-eliminar'
import { DialogoRegistro } from '@/components/panel/dialogo-registro'
import { EtiquetaEstado } from '@/components/panel/etiqueta-estado'
import { AudienciaCampana } from '@/components/panel/marketing/audiencia-campana'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fechaHora, moneda, numero, porcentaje } from '@/lib/formato'
import { etiquetaCanal, ETIQUETA_SEGMENTO, TONO_CANAL, type SegmentoAudiencia } from '@/lib/marketing'
import type { Ajustes } from '@/lib/payload'
import type { MapaOpciones } from '@/lib/recursos'

export type FilaCampana = {
  id: string | number
  nombre: string
  canal: string
  segmento: string
  estado: string
  asunto?: string | null
  mensaje?: string | null
  cuponId?: string | null
  programadaPara?: string | null
  enviados: number
  aperturas: number
  clics: number
  conversiones: number
  ingresosGenerados: number
}

/** Botón que registra el envío de una campaña (sin integración real de correo/SMS). */
export function BotonMarcarEnviada({ campana }: { campana: FilaCampana }) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()

  const enviar = () => {
    iniciar(async () => {
      const resultado = await marcarCampanaEnviada(campana.id)
      if (resultado.error) {
        toast.error(resultado.error)
        return
      }
      toast.success(resultado.mensaje ?? 'Campaña registrada como enviada.')
      router.refresh()
    })
  }

  return (
    <Button
      variant="outline"
      size="xs"
      onClick={enviar}
      disabled={pendiente}
      title="Registrar el envío de esta campaña"
    >
      {pendiente ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <Send className="size-3" />
      )}
      Marcar como enviada
    </Button>
  )
}

/** Tabla de campañas con métricas, audiencia estimada y acciones. */
export function TablaCampanas({
  campanas,
  opciones,
  ajustes,
}: {
  campanas: FilaCampana[]
  opciones: MapaOpciones
  ajustes: Ajustes
}) {
  if (campanas.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card px-6 py-12 text-center">
        <p className="font-medium">Aún no hay campañas</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Crea tu primera campaña para segmentar a tus clientes.
        </p>
        <div className="mt-4 flex justify-center">
          <DialogoRegistro recurso="campanas" opciones={opciones} etiqueta="Nueva campaña" />
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Campaña</TableHead>
            <TableHead>Canal</TableHead>
            <TableHead>Segmento</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="hidden lg:table-cell">Programada</TableHead>
            <TableHead className="text-right">Enviados</TableHead>
            <TableHead className="hidden text-right xl:table-cell">Aperturas</TableHead>
            <TableHead className="hidden text-right xl:table-cell">Clics</TableHead>
            <TableHead className="hidden text-right xl:table-cell">Conversiones</TableHead>
            <TableHead className="text-right">Ingresos</TableHead>
            <TableHead className="hidden text-right lg:table-cell">Apertura</TableHead>
            <TableHead className="w-[1%] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campanas.map((campana) => {
            const tasaApertura = campana.enviados
              ? campana.aperturas / campana.enviados
              : 0
            const enviada = campana.estado === 'enviada'

            return (
              <TableRow key={String(campana.id)}>
                <TableCell className="min-w-[14rem]">
                  <p className="font-medium">{campana.nombre}</p>
                  {campana.asunto && (
                    <p className="mt-0.5 line-clamp-1 max-w-[22rem] text-xs text-muted-foreground">
                      {campana.asunto}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={TONO_CANAL[campana.canal] ?? 'bg-muted text-muted-foreground'}
                  >
                    {etiquetaCanal(campana.canal)}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {ETIQUETA_SEGMENTO[campana.segmento as SegmentoAudiencia] ?? campana.segmento}
                </TableCell>
                <TableCell>
                  <EtiquetaEstado valor={campana.estado} />
                </TableCell>
                <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground lg:table-cell">
                  {campana.programadaPara ? fechaHora(campana.programadaPara) : '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {numero(campana.enviados)}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums xl:table-cell">
                  {numero(campana.aperturas)}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums xl:table-cell">
                  {numero(campana.clics)}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums xl:table-cell">
                  {numero(campana.conversiones)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {moneda(campana.ingresosGenerados, ajustes)}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums lg:table-cell">
                  {campana.enviados ? porcentaje(tasaApertura) : '—'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {!enviada && <BotonMarcarEnviada campana={campana} />}
                    <AudienciaCampana
                      campana={campana.nombre}
                      segmento={campana.segmento}
                      canal={campana.canal}
                    />
                    <DialogoRegistro
                      recurso="campanas"
                      id={String(campana.id)}
                      valores={{
                        nombre: campana.nombre,
                        canal: campana.canal,
                        segmento: campana.segmento,
                        asunto: campana.asunto ?? '',
                        mensaje: campana.mensaje ?? '',
                        cupon: campana.cuponId ?? '',
                        estado: campana.estado,
                        programadaPara: campana.programadaPara ?? '',
                      }}
                      opciones={opciones}
                      variante="editar"
                    />
                    <BotonEliminar
                      recurso="campanas"
                      id={String(campana.id)}
                      nombre={campana.nombre}
                    />
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
