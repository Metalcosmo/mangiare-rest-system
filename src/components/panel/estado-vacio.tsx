import { Inbox } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function EstadoVacio({
  titulo,
  descripcion,
  icono: Icono = Inbox,
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
    <Card className={cn('border-dashed', className)}>
      <CardContent className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Icono className="size-6" />
        </span>
        <div>
          <p className="font-medium">{titulo}</p>
          {descripcion && (
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{descripcion}</p>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}
