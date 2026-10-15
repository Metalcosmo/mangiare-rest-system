import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function EncabezadoPagina({
  titulo,
  descripcion,
  icono: Icono,
  children,
  className,
}: {
  titulo: string
  descripcion?: string
  icono?: LucideIcon
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="flex items-start gap-3">
        {Icono && (
          <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icono className="size-5" />
          </span>
        )}
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{titulo}</h1>
          {descripcion && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{descripcion}</p>
          )}
        </div>
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}
