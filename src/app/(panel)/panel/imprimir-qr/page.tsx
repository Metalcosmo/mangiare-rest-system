import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

import { generarQrMesas } from '@/actions/salon'
import { BotonImprimirHoja } from '@/components/panel/salon/hoja-qr'
import { Button } from '@/components/ui/button'
import { requireUsuario } from '@/lib/auth'

export const metadata = {
  title: 'Hoja de códigos QR',
  description: 'Hoja imprimible con los códigos QR de todas las mesas activas',
}

/**
 * Hoja imprimible de códigos QR.
 *
 * Vive fuera del grupo `(app)` para no heredar el shell autenticado del panel:
 * así la impresión sale limpia, sin menús ni encabezados.
 */
export default async function PaginaImprimirQr() {
  await requireUsuario()

  const { qrs, error } = await generarQrMesas()
  const disponibles = qrs.filter((qr) => Boolean(qr.dataUrl && qr.url))

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 print:max-w-none print:px-0 print:py-0">
      <style>{'@media print { @page { margin: 12mm } }'}</style>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link href="/panel/mesas">
            <ArrowLeft className="size-4" />
            Volver a mesas
          </Link>
        </Button>
        <BotonImprimirHoja />
      </div>

      <header className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Códigos QR de las mesas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recorta e instala un código en cada mesa para que los comensales abran la carta digital.
        </p>
      </header>

      {error && (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {!error && disponibles.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          No hay mesas activas con código QR para imprimir.
        </p>
      )}

      {disponibles.length > 0 && (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 print:gap-8">
          {disponibles.map((qr, indice) => (
            <div
              key={`${qr.slug ?? 'mesa'}-${indice}`}
              className="break-inside-avoid rounded-xl border p-4 text-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr.dataUrl}
                alt={`Código QR de ${qr.nombre ?? 'la mesa'}`}
                width={220}
                height={220}
                className="mx-auto size-40 print:size-44"
              />
              <p className="mt-3 text-sm font-semibold">{qr.nombre ?? 'Mesa'}</p>
              <p className="mt-0.5 break-all text-[10px] leading-tight text-muted-foreground">
                {qr.url}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
