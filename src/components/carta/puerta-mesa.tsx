'use client'

import { KeyRound, Loader2, UserPlus, UtensilsCrossed } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect } from 'react'

import {
  abrirSesionMesa,
  reclamarSesionMesa,
  unirSesionMesa,
  type EstadoPuerta,
} from '@/actions/mesas'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Ajustes } from '@/lib/payload'

export type ModoPuerta = 'abrir' | 'unir' | 'reclamar'

const ESTADO_INICIAL: EstadoPuerta = {}

const ACCIONES = {
  abrir: abrirSesionMesa,
  unir: unirSesionMesa,
  reclamar: reclamarSesionMesa,
} as const

const COPIA: Record<ModoPuerta, { titulo: string; descripcion: string; boton: string }> = {
  abrir: {
    titulo: 'Abre la mesa',
    descripcion:
      'Escribe tu nombre y tu cédula. Quien abre la mesa queda como anfitrión: los demás se unen escribiendo tu cédula, y sólo tú puedes mandar el pedido al mesero.',
    boton: 'Abrir la mesa',
  },
  unir: {
    titulo: 'Esta mesa ya está abierta',
    descripcion:
      'Para agregar o quitar platillos, escribe la cédula de quien abrió la mesa.',
    boton: 'Unirme a la mesa',
  },
  reclamar: {
    titulo: 'El mesero ya abrió esta mesa',
    descripcion:
      'Escribe tu nombre y tu cédula para quedar como anfitrión. Después, los demás se unen con tu cédula.',
    boton: 'Identificarme',
  },
}

/**
 * Puerta de la carta pública: sin ella nadie entra a la mesa.
 *
 * El modo lo decide el servidor: si la mesa no tiene sesión se abre; si ya la
 * tiene, se pide la cédula del anfitrión. Aquí nunca se muestra el nombre del
 * anfitrión, para no filtrar información a quien no conoce la cédula.
 */
export function PuertaMesa({
  modo,
  mesa,
  ajustes,
}: {
  modo: ModoPuerta
  mesa: { nombre: string; slug: string }
  ajustes: Ajustes
}) {
  const router = useRouter()
  const copia = COPIA[modo]
  const pideNombre = modo !== 'unir'

  const [estado, accion, pendiente] = useActionState(ACCIONES[modo], ESTADO_INICIAL)

  useEffect(() => {
    if (estado.ok) router.refresh()
  }, [estado, router])

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-5 py-10">
      <header className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <UtensilsCrossed className="size-7" />
        </span>
        <div>
          <p className="text-sm font-semibold">{ajustes.nombreComercial}</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{copia.titulo}</h1>
        </div>
        <p className="text-sm text-muted-foreground">{copia.descripcion}</p>
      </header>

      <Card>
        <CardContent className="p-5">
          <form action={accion} className="flex flex-col gap-4">
            <input type="hidden" name="mesaSlug" value={mesa.slug} />

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm">{mesa.nombre}</Label>
              <p className="text-xs text-muted-foreground">
                Estás en {ajustes.nombreComercial}
                {ajustes.direccion ? ` · ${ajustes.direccion}` : ''}
              </p>
            </div>

            {pideNombre && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="puerta-nombre" className="flex items-center gap-2 text-sm">
                  <UserPlus className="size-3.5" />
                  Tu nombre
                </Label>
                <Input
                  id="puerta-nombre"
                  name="nombre"
                  autoComplete="name"
                  required
                  placeholder="Ana Pérez"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="puerta-cedula" className="flex items-center gap-2 text-sm">
                <KeyRound className="size-3.5" />
                {modo === 'unir' ? 'Cédula del anfitrión' : 'Tu cédula'}
              </Label>
              <Input
                id="puerta-cedula"
                name="cedula"
                inputMode="text"
                autoComplete="off"
                required
                placeholder="V-12.345.678"
              />
              {modo !== 'unir' && (
                <p className="text-xs text-muted-foreground">
                  La usan los demás para unirse a tu mesa.
                </p>
              )}
            </div>

            {estado.error && (
              <Alert variant="destructive">
                <AlertDescription>{estado.error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" size="lg" disabled={pendiente}>
              {pendiente ? <Loader2 className="size-4 animate-spin" /> : null}
              {pendiente ? 'Un momento…' : copia.boton}
            </Button>
          </form>
        </CardContent>
      </Card>

      {ajustes.notaServicio && (
        <Alert>
          <AlertDescription>{ajustes.notaServicio}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
