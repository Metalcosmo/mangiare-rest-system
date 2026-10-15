import { Award, Coins, Sparkles } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { NIVELES } from '@/hooks/clientes'
import { moneda, numero } from '@/lib/formato'
import type { Ajustes } from '@/lib/payload'

/**
 * Explica el programa de lealtad con los valores configurados en los ajustes y
 * muestra cuántos clientes hay en cada nivel.
 */
export function ResumenLealtad({
  ajustes,
  conteos,
  total,
}: {
  ajustes: Ajustes
  conteos: Record<string, number>
  total: number
}) {
  const puntosPorUnidad = Number(ajustes.puntosPorUnidad ?? 1)
  const valorPunto = Number(ajustes.valorPunto ?? 0.1)
  const simbolo = ajustes.simboloMoneda ?? '$'
  const mayor = Math.max(...NIVELES.map((nivel) => conteos[nivel.value] ?? 0), 1)

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="rounded-xl border bg-card lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" />
            Cómo funciona el programa
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <Coins className="size-4" />
            </span>
            <div>
              <p className="font-medium">Acumulación</p>
              <p className="text-muted-foreground">
                Cada {simbolo}1 de consumo suma{' '}
                <strong>{numero(puntosPorUnidad, puntosPorUnidad % 1 === 0 ? 0 : 2)}</strong>{' '}
                {puntosPorUnidad === 1 ? 'punto' : 'puntos'}.
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Award className="size-4" />
            </span>
            <div>
              <p className="font-medium">Canje</p>
              <p className="text-muted-foreground">
                Cada punto vale <strong>{moneda(valorPunto, ajustes)}</strong>. Un cliente con
                1,000 puntos puede canjear hasta {moneda(1000 * valorPunto, ajustes)} en
                recompensas.
              </p>
            </div>
          </div>

          <Separator />

          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            Los niveles suben automáticamente según el gasto histórico y la frecuencia de visita.
            El nivel se recalcula cada vez que se guarda el cliente.
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-2">
        {NIVELES.map((nivel) => {
          const cantidad = conteos[nivel.value] ?? 0
          const porcentaje = total > 0 ? Math.round((cantidad / total) * 100) : 0
          return (
            <Card key={nivel.value} className="rounded-xl border bg-card">
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{nivel.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {nivel.minimo === 0
                        ? 'Desde el primer consumo'
                        : `Desde ${moneda(nivel.minimo, ajustes)} de gasto`}
                    </p>
                  </div>
                  <p className="text-2xl font-semibold tabular-nums">{numero(cantidad)}</p>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max((cantidad / mayor) * 100, cantidad > 0 ? 4 : 0)}%` }}
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  {porcentaje}% de la cartera de clientes
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
