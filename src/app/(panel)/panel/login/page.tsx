import { UtensilsCrossed } from 'lucide-react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { FormularioLogin } from '@/components/panel/formulario-login'
import { usuarioActual } from '@/lib/auth'
import { obtenerAjustes } from '@/lib/payload'

export const metadata: Metadata = { title: 'Iniciar sesión' }

export default async function LoginPage() {
  const [usuario, ajustes] = await Promise.all([usuarioActual(), obtenerAjustes()])

  if (usuario) redirect('/panel')

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary-foreground/15">
            <UtensilsCrossed className="size-5" />
          </span>
          <span className="text-lg font-semibold">{ajustes.nombreComercial}</span>
        </div>

        <div className="max-w-md">
          <h1 className="text-3xl font-semibold leading-tight">
            Todo el restaurante en una sola plataforma.
          </h1>
          <p className="mt-3 text-sm text-primary-foreground/80">
            Punto de venta, cocina, inventario, personal, clientes y reservaciones trabajando
            sobre los mismos datos, sin capturar nada dos veces.
          </p>
        </div>

        <p className="text-xs text-primary-foreground/70">
          {ajustes.eslogan || 'Sistema de operación para restaurantes'}
        </p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col gap-2">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground lg:hidden">
              <UtensilsCrossed className="size-5" />
            </span>
            <h2 className="text-2xl font-semibold tracking-tight">Entrar al panel</h2>
            <p className="text-sm text-muted-foreground">
              Acceso para el equipo de {ajustes.nombreComercial}.
            </p>
          </div>

          <FormularioLogin />

          <p className="mt-8 text-center text-xs text-muted-foreground">
            ¿Eres cliente? Escanea el código QR de tu mesa para abrir la carta.
          </p>
        </div>
      </div>
    </div>
  )
}
