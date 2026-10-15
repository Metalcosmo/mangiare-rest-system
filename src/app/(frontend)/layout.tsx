import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { Toaster } from '@/components/ui/sonner'
import { obtenerAjustes } from '@/lib/payload'

import '../globals.css'

export async function generateMetadata(): Promise<Metadata> {
  const ajustes = await obtenerAjustes()

  return {
    title: {
      default: `${ajustes.nombreComercial} · Carta digital`,
      template: `%s · ${ajustes.nombreComercial}`,
    },
    description:
      ajustes.eslogan ??
      'Consulta la carta y ordena directo desde tu mesa escaneando el código QR.',
  }
}

export default async function CartaRootLayout({ children }: { children: ReactNode }) {
  const ajustes = await obtenerAjustes()

  return (
    <html lang="es">
      <body
        className="min-h-screen bg-background text-foreground antialiased"
        style={
          {
            '--primary': ajustes.colorPrimario ?? '#c2410c',
            '--ring': ajustes.colorPrimario ?? '#c2410c',
            '--foreground': ajustes.colorSecundario ?? '#1c1917',
          } as React.CSSProperties
        }
      >
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  )
}
