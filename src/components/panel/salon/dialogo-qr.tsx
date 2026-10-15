'use client'

import { Copy, Download, Loader2, Printer, QrCode } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { generarQrMesa } from '@/actions/salon'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type Props = {
  mesaId: string
  nombre: string
  /** Indica si la mesa ya tiene un slug propio configurado en la colección. */
  slugConfigurado?: boolean
}

type QrListo = { url: string; dataUrl: string; slug: string }

/** Botón de fila que abre el código QR de una mesa y permite imprimirlo. */
export function DialogoQr({ mesaId, nombre, slugConfigurado = false }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [qr, setQr] = useState<QrListo | null>(null)

  const manejarApertura = async (siguiente: boolean) => {
    setAbierto(siguiente)
    if (!siguiente || qr || cargando) return

    setCargando(true)
    const resultado = await generarQrMesa(mesaId)
    setCargando(false)

    if (resultado.error || !resultado.url || !resultado.dataUrl || !resultado.slug) {
      toast.error(resultado.error ?? 'No pudimos generar el código QR.')
      return
    }

    setQr({ url: resultado.url, dataUrl: resultado.dataUrl, slug: resultado.slug })
  }

  const imprimir = () => {
    if (!qr) return
    const ventana = window.open('', '_blank', 'width=640,height=760')
    if (!ventana) {
      toast.error('Permite las ventanas emergentes para poder imprimir.')
      return
    }

    const documento = ventana.document
    documento.title = `QR ${nombre}`
    documento.body.style.cssText = 'margin:0;padding:36px;font-family:system-ui,sans-serif'

    const titulo = documento.createElement('h1')
    titulo.textContent = nombre
    titulo.style.cssText = 'margin:0 0 16px;font-size:20px;text-align:center'

    const imagen = documento.createElement('img')
    imagen.src = qr.dataUrl
    imagen.alt = `Código QR de ${nombre}`
    imagen.style.cssText = 'display:block;width:320px;height:320px;margin:0 auto'

    const pie = documento.createElement('p')
    pie.textContent = qr.url
    pie.style.cssText = 'margin:16px 0 0;font-size:12px;color:#555;text-align:center;word-break:break-all'

    documento.body.appendChild(titulo)
    documento.body.appendChild(imagen)
    documento.body.appendChild(pie)
    ventana.focus()
    ventana.print()
  }

  const copiar = async () => {
    if (!qr) return
    try {
      await navigator.clipboard.writeText(qr.url)
      toast.success('Enlace copiado al portapapeles.')
    } catch {
      toast.error('No pudimos copiar el enlace.')
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={manejarApertura}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" title="Código QR">
          <QrCode className="size-3.5" />
          QR
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Código QR · {nombre}</DialogTitle>
          <DialogDescription>
            Los comensales escanean este código para abrir la carta de la mesa.
          </DialogDescription>
        </DialogHeader>

        {cargando && (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
            <p className="text-sm">Generando código QR…</p>
          </div>
        )}

        {!cargando && !qr && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No pudimos generar el código QR de esta mesa.
          </p>
        )}

        {!cargando && qr && (
          <div className="flex flex-col items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr.dataUrl}
              alt={`Código QR de ${nombre}`}
              width={240}
              height={240}
              className="size-60 rounded-xl border bg-white p-2"
            />

            <div className="w-full rounded-lg bg-muted px-3 py-2">
              <p className="break-all text-center text-xs text-muted-foreground">{qr.url}</p>
            </div>

            {!slugConfigurado && (
              <p className="text-center text-xs text-amber-600 dark:text-amber-400">
                Esta mesa todavía no tiene slug configurado; el QR usa un identificador derivado
                del nombre. Asígnalo en el formulario de la mesa para fijarlo.
              </p>
            )}

            <div className="flex w-full flex-wrap justify-center gap-2">
              <Button asChild variant="outline" size="sm">
                <a download={`qr-${qr.slug}.png`} href={qr.dataUrl}>
                  <Download className="size-4" />
                  Descargar PNG
                </a>
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={imprimir}>
                <Printer className="size-4" />
                Imprimir
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={copiar}>
                <Copy className="size-4" />
                Copiar enlace
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
