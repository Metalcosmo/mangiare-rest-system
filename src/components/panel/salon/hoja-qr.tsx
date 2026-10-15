'use client'

import { Printer } from 'lucide-react'
import { useEffect } from 'react'

import { Button } from '@/components/ui/button'

/** Botón de impresión de la hoja de códigos QR (con impresión automática). */
export function BotonImprimirHoja({ auto = true }: { auto?: boolean }) {
  useEffect(() => {
    if (!auto) return
    const temporizador = setTimeout(() => window.print(), 600)
    return () => clearTimeout(temporizador)
  }, [auto])

  return (
    <Button type="button" size="sm" onClick={() => window.print()}>
      <Printer className="size-4" />
      Imprimir hoja
    </Button>
  )
}
