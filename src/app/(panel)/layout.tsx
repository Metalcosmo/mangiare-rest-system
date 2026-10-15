import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { Toaster } from '@/components/ui/sonner'

import '../globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Panel de operación',
    template: '%s · Panel',
  },
  description: 'Sistema de operación para restaurantes',
}

export default function PanelRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
