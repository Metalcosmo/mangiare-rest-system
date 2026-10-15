'use client'

import { Pause, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'

/**
 * Refresca los datos del servidor cada cierto tiempo para que la vista
 * refleje los cambios hechos desde otros dispositivos. El intervalo se limpia
 * al desmontar el componente.
 *
 * Lo comparten el mapa de salón y la sección del mesero.
 */
export function AutoRefresco({ intervalo = 20000 }: { intervalo?: number }) {
  const router = useRouter()
  const [activo, setActivo] = useState(true)

  useEffect(() => {
    if (!activo) return
    const temporizador = setInterval(() => router.refresh(), intervalo)
    return () => clearInterval(temporizador)
  }, [activo, intervalo, router])

  const segundos = Math.round(intervalo / 1000)

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => setActivo((valor) => !valor)}
      title={
        activo
          ? `Actualización automática cada ${segundos} segundos`
          : 'Actualización automática en pausa'
      }
    >
      {activo ? <RefreshCw className="size-4" /> : <Pause className="size-4" />}
      {activo ? `Auto ${segundos} s` : 'Pausado'}
    </Button>
  )
}
