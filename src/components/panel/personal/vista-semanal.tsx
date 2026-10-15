import { CalendarOff } from 'lucide-react'

import { DialogoRegistro } from '@/components/panel/dialogo-registro'
import { TarjetaTurno, type TurnoVista } from '@/components/panel/personal/acciones-turno'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { numero } from '@/lib/formato'
import type { MapaOpciones } from '@/lib/recursos'

export type DiaSemana = {
  /** Clave ISO (YYYY-MM-DD) de la columna. */
  clave: string
  /** "lunes", "martes"… en español. */
  dia: string
  /** Número de día del mes. */
  numeroDia: number
  /** true si la columna corresponde a hoy. */
  esHoy: boolean
}

/** Vista semanal: una columna por día con los turnos programados. */
export function VistaSemanal({
  dias,
  turnos,
  opciones,
}: {
  dias: DiaSemana[]
  turnos: TurnoVista[]
  opciones: MapaOpciones
}) {
  const porDia = new Map<string, TurnoVista[]>()
  for (const turno of turnos) {
    const clave = turno.fecha.slice(0, 10)
    const lista = porDia.get(clave) ?? []
    lista.push(turno)
    porDia.set(clave, lista)
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {dias.map((dia) => {
        const delDia = (porDia.get(dia.clave) ?? []).sort((a, b) =>
          a.horaInicio.localeCompare(b.horaInicio),
        )
        const horas = delDia.reduce((total, turno) => total + Number(turno.horas ?? 0), 0)

        return (
          <Card
            key={dia.clave}
            className={dia.esHoy ? 'gap-3 border-primary/40 py-4' : 'gap-3 py-4'}
          >
            <CardHeader className="px-4">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold capitalize">
                  {dia.dia}
                  <span className="ml-2 text-muted-foreground">{dia.numeroDia}</span>
                </p>
                {dia.esHoy && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-primary">
                    Hoy
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {delDia.length === 0
                  ? 'Sin turnos'
                  : `${numero(delDia.length)} turnos · ${numero(horas, horas % 1 === 0 ? 0 : 2)} h`}
              </p>
            </CardHeader>

            <CardContent className="flex flex-col gap-2 px-3">
              {delDia.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-3 py-6 text-center">
                  <CalendarOff className="size-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Día libre de turnos</p>
                  <DialogoRegistro
                    recurso="turnos"
                    opciones={opciones}
                    valores={{ fecha: dia.clave }}
                    etiqueta="Programar"
                    className="h-7 px-2 text-xs"
                  />
                </div>
              ) : (
                delDia.map((turno) => (
                  <TarjetaTurno key={String(turno.id)} turno={turno} opciones={opciones} />
                ))
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
