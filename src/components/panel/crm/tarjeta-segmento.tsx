import { Cake, Crown, Moon, Repeat2, Sparkles, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { DialogoSegmento } from '@/components/panel/crm/dialogo-segmento'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { numero, iniciales } from '@/lib/formato'
import type { Segmento } from '@/actions/crm'

const ICONOS: Record<string, LucideIcon> = {
  vip: Crown,
  frecuente: Repeat2,
  nuevo: Sparkles,
  inactivo: Moon,
  cumpleanos: Cake,
}

/** Tarjeta de un segmento de clientes con conteo, muestra y acceso a la lista. */
export function TarjetaSegmento({ segmento }: { segmento: Segmento }) {
  const Icono = ICONOS[segmento.clave] ?? Users
  const muestra = segmento.clientes.slice(0, 4)
  const restantes = segmento.total - muestra.length

  return (
    <Card className="flex h-full flex-col rounded-xl border bg-card">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icono className="size-5" />
          </span>
          <div>
            <CardTitle className="text-base">{segmento.titulo}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{segmento.descripcion}</p>
          </div>
        </div>
        <span className="text-2xl font-semibold tabular-nums">{numero(segmento.total)}</span>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        {muestra.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {muestra.map((cliente) => (
              <li key={cliente.id} className="flex items-center gap-2 text-sm">
                <Avatar className="size-7">
                  <AvatarFallback className="bg-muted text-[10px] font-semibold">
                    {iniciales(cliente.nombre)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{cliente.nombre}</span>
              </li>
            ))}
            {restantes > 0 && (
              <li className="pl-9 text-xs text-muted-foreground">
                y {numero(restantes)} cliente{restantes === 1 ? '' : 's'} más
              </li>
            )}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Ningún cliente entra en este segmento por ahora.
          </p>
        )}

        <DialogoSegmento
          titulo={segmento.titulo}
          descripcion={`${numero(segmento.total)} clientes en este segmento.`}
          clientes={segmento.clientes}
        />
      </CardContent>
    </Card>
  )
}
