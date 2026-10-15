import { QrCode, UtensilsCrossed } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { obtenerAjustes } from '@/lib/payload'

export async function generateMetadata(): Promise<Metadata> {
  const ajustes = await obtenerAjustes()
  return {
    title: `${ajustes.nombreComercial} · Carta digital`,
    description:
      ajustes.eslogan ?? 'Consulta la carta y ordena directo desde tu mesa escaneando el código QR.',
  }
}

export default async function PortadaCartaPage({
  searchParams,
}: {
  searchParams: Promise<{ mesa?: string }>
}) {
  const { mesa } = await searchParams

  // Soporta enlaces directos del tipo /?mesa=terraza-1
  if (mesa) redirect(`/mesa/${mesa}`)

  const ajustes = await obtenerAjustes()

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <header className="flex flex-col items-center gap-4 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <UtensilsCrossed className="size-7" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {ajustes.nombreComercial}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            {ajustes.mensajeBienvenida ??
              'Escanea el código QR de tu mesa para ver la carta y ordenar desde tu teléfono.'}
          </p>
        </div>
      </header>

      <Card className="mt-10 border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <QrCode className="size-6" />
          </span>
          <p className="font-medium">Estás en el restaurante</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Cada mesa tiene su propio código QR impreso. Escanéalo con la cámara del teléfono y
            llegarás directo a la carta de tu mesa.
          </p>
        </CardContent>
      </Card>

      <footer className="mt-14 flex flex-col items-center gap-2 border-t pt-8 text-center text-xs text-muted-foreground">
        <p>{ajustes.mensajePie ?? 'Gracias por tu visita'}</p>
        {ajustes.direccion && <p>{ajustes.direccion}</p>}
        <Button asChild variant="link" size="sm" className="text-xs">
          <Link href="/panel">Acceso del personal</Link>
        </Button>
      </footer>
    </div>
  )
}
