'use client'

import { Loader2, UserRoundSearch } from 'lucide-react'
import { useState, useTransition } from 'react'

import { estimarAudiencia, type ResultadoAudiencia } from '@/actions/marketing'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { numero } from '@/lib/formato'
import {
  CRITERIO_SEGMENTO,
  etiquetaCanal,
  ETIQUETA_SEGMENTO,
  type SegmentoAudiencia,
} from '@/lib/marketing'

/**
 * Diálogo que calcula en vivo cuántos clientes caen en el segmento de la campaña.
 * Llama a la server action `estimarAudiencia` al abrirse.
 */
export function AudienciaCampana({
  campana,
  segmento,
  canal,
}: {
  campana: string
  segmento: string
  canal?: string | null
}) {
  const [abierto, setAbierto] = useState(false)
  const [resultado, setResultado] = useState<ResultadoAudiencia | null>(null)
  const [pendiente, iniciar] = useTransition()

  const criterio =
    CRITERIO_SEGMENTO[segmento as SegmentoAudiencia] ?? 'Segmento personalizado.'

  const consultar = () => {
    setAbierto(true)
    iniciar(async () => {
      const datos = await estimarAudiencia(segmento)
      setResultado(datos)
    })
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <Button variant="ghost" size="icon-sm" aria-label="Ver audiencia" onClick={consultar}>
        <UserRoundSearch className="size-4" />
      </Button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Audiencia estimada</DialogTitle>
          <DialogDescription>
            {campana} · {ETIQUETA_SEGMENTO[segmento as SegmentoAudiencia] ?? segmento}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Criterio del segmento</p>
          <p className="mt-1">{criterio}</p>
          {canal && (
            <p className="mt-2">
              Canal de contacto:{' '}
              <span className="font-medium text-foreground">{etiquetaCanal(canal)}</span>
            </p>
          )}
        </div>

        {pendiente || !resultado ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Calculando audiencia…
          </div>
        ) : resultado.error ? (
          <p className="py-6 text-center text-sm text-destructive">{resultado.error}</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tabular-nums">
                {numero(resultado.total)}
              </span>
              <span className="text-sm text-muted-foreground">
                {resultado.total === 1 ? 'cliente' : 'clientes'} en el segmento
              </span>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Muestra de contactos
              </p>
              {resultado.ejemplos.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ningún cliente cumple el criterio de este segmento.
                </p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {resultado.ejemplos.map((cliente) => (
                    <li
                      key={`${cliente.nombre}-${cliente.telefono}`}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                    >
                      <span className="truncate font-medium">{cliente.nombre}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {cliente.telefono}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              La estimación se calcula con los clientes registrados al momento de abrir este
              panel.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
