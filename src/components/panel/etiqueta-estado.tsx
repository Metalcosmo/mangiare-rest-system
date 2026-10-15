import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type Tono = 'neutro' | 'info' | 'aviso' | 'exito' | 'peligro' | 'morado'

const TONOS: Record<Tono, string> = {
  neutro: 'bg-muted text-muted-foreground hover:bg-muted',
  info: 'bg-sky-500/15 text-sky-700 hover:bg-sky-500/20 dark:text-sky-300',
  aviso: 'bg-amber-500/15 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300',
  exito: 'bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300',
  peligro: 'bg-destructive/15 text-destructive hover:bg-destructive/20',
  morado: 'bg-violet-500/15 text-violet-700 hover:bg-violet-500/20 dark:text-violet-300',
}

/** Tono y etiqueta por defecto de los estados del sistema. */
export const TONO_ESTADO: Record<string, { tono: Tono; etiqueta: string }> = {
  // Pedidos
  por_confirmar: { tono: 'aviso', etiqueta: 'Por confirmar' },
  nuevo: { tono: 'info', etiqueta: 'Nuevo' },
  en_preparacion: { tono: 'aviso', etiqueta: 'En preparación' },
  listo: { tono: 'exito', etiqueta: 'Listo' },
  servido: { tono: 'morado', etiqueta: 'Servido' },
  pagado: { tono: 'exito', etiqueta: 'Pagado' },
  cancelado: { tono: 'peligro', etiqueta: 'Cancelado' },
  // Ítems del KDS
  pendiente: { tono: 'info', etiqueta: 'Pendiente' },
  preparando: { tono: 'aviso', etiqueta: 'Preparando' },
  // Mesas
  libre: { tono: 'exito', etiqueta: 'Libre' },
  ocupada: { tono: 'peligro', etiqueta: 'Ocupada' },
  reservada: { tono: 'morado', etiqueta: 'Reservada' },
  limpieza: { tono: 'aviso', etiqueta: 'Por limpiar' },
  fuera_servicio: { tono: 'neutro', etiqueta: 'Fuera de servicio' },
  // Reservaciones
  confirmada: { tono: 'exito', etiqueta: 'Confirmada' },
  sentada: { tono: 'info', etiqueta: 'En mesa' },
  completada: { tono: 'neutro', etiqueta: 'Completada' },
  cancelada: { tono: 'peligro', etiqueta: 'Cancelada' },
  no_asistio: { tono: 'peligro', etiqueta: 'No se presentó' },
  // Canales
  mesa: { tono: 'info', etiqueta: 'En mesa' },
  mostrador: { tono: 'morado', etiqueta: 'Mostrador' },
  para_llevar: { tono: 'aviso', etiqueta: 'Para llevar' },
  // Turnos
  programado: { tono: 'info', etiqueta: 'Programado' },
  ausente: { tono: 'peligro', etiqueta: 'Ausente' },
  // Niveles de lealtad
  bronce: { tono: 'aviso', etiqueta: 'Bronce' },
  plata: { tono: 'neutro', etiqueta: 'Plata' },
  oro: { tono: 'aviso', etiqueta: 'Oro' },
  platino: { tono: 'morado', etiqueta: 'Platino' },
  // Marketing
  borrador: { tono: 'neutro', etiqueta: 'Borrador' },
  programada: { tono: 'info', etiqueta: 'Programada' },
  enviada: { tono: 'exito', etiqueta: 'Enviada' },
  // Inventario
  entrada: { tono: 'exito', etiqueta: 'Entrada' },
  salida: { tono: 'aviso', etiqueta: 'Salida' },
  ajuste: { tono: 'info', etiqueta: 'Ajuste' },
  merma: { tono: 'peligro', etiqueta: 'Merma' },
  consumo: { tono: 'neutro', etiqueta: 'Consumo' },
  devolucion: { tono: 'morado', etiqueta: 'Devolución' },
  // Estaciones
  cocina: { tono: 'aviso', etiqueta: 'Cocina' },
  parrilla: { tono: 'peligro', etiqueta: 'Parrilla' },
  barra: { tono: 'info', etiqueta: 'Barra' },
  postres: { tono: 'morado', etiqueta: 'Postres' },
}

export function EtiquetaEstado({
  valor,
  tono,
  etiqueta,
  className,
}: {
  valor?: string | null
  tono?: Tono
  etiqueta?: string
  className?: string
}) {
  if (!valor && !etiqueta) return <span className="text-muted-foreground">—</span>

  const conocido = valor ? TONO_ESTADO[valor] : undefined

  return (
    <Badge
      variant="secondary"
      className={cn('border-0 font-medium', TONOS[tono ?? conocido?.tono ?? 'neutro'], className)}
    >
      {etiqueta ?? conocido?.etiqueta ?? valor}
    </Badge>
  )
}
