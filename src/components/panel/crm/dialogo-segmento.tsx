'use client'

import { Eye, Mail, Phone } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { iniciales } from '@/lib/formato'

export type ClienteSegmentoLista = {
  id: string
  nombre: string
  telefono?: string | null
  email?: string | null
}

/** Muestra en un diálogo la lista completa de clientes de un segmento. */
export function DialogoSegmento({
  titulo,
  descripcion,
  clientes,
}: {
  titulo: string
  descripcion?: string
  clientes: ClienteSegmentoLista[]
}) {
  const [abierto, setAbierto] = useState(false)

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={clientes.length === 0}>
          <Eye className="size-4" />
          Ver clientes
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            {descripcion ?? `${clientes.length} clientes en este segmento.`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-3">
          <ul className="flex flex-col gap-1">
            {clientes.map((cliente) => (
              <li key={cliente.id}>
                <Link
                  href={`/panel/clientes/${cliente.id}`}
                  onClick={() => setAbierto(false)}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50"
                >
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {iniciales(cliente.nombre)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{cliente.nombre}</p>
                    <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                      {cliente.telefono && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="size-3" />
                          {cliente.telefono}
                        </span>
                      )}
                      {cliente.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="size-3" />
                          {cliente.email}
                        </span>
                      )}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
