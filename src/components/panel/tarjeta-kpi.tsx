import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function TarjetaKpi({
  etiqueta,
  valor,
  detalle,
  icono: Icono,
  tendencia,
  acento,
}: {
  etiqueta: string
  valor: string
  detalle?: string
  icono?: LucideIcon
  /** Variación porcentual respecto al periodo anterior. */
  tendencia?: number | null
  acento?: 'primario' | 'exito' | 'aviso' | 'peligro'
}) {
  const acentos: Record<string, string> = {
    primario: 'bg-primary/10 text-primary',
    exito: 'bg-emerald-500/10 text-emerald-600',
    aviso: 'bg-amber-500/10 text-amber-600',
    peligro: 'bg-destructive/10 text-destructive',
  }

  const positiva = (tendencia ?? 0) >= 0

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {etiqueta}
          </p>
          <p className="mt-2 truncate text-2xl font-semibold tracking-tight">{valor}</p>
          {(detalle || tendencia !== undefined) && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              {tendencia !== undefined && tendencia !== null && (
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 font-medium',
                    positiva ? 'text-emerald-600' : 'text-destructive',
                  )}
                >
                  {positiva ? (
                    <ArrowUpRight className="size-3.5" />
                  ) : (
                    <ArrowDownRight className="size-3.5" />
                  )}
                  {Math.abs(tendencia).toFixed(0)}%
                </span>
              )}
              {detalle && <span className="truncate text-muted-foreground">{detalle}</span>}
            </div>
          )}
        </div>
        {Icono && (
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl',
              acentos[acento ?? 'primario'],
            )}
          >
            <Icono className="size-5" />
          </span>
        )}
      </CardContent>
    </Card>
  )
}
