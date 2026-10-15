'use client'

import { Loader2, LogIn } from 'lucide-react'
import { useActionState } from 'react'

import { iniciarSesion, type EstadoLogin } from '@/actions/sesion'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const ESTADO_INICIAL: EstadoLogin = {}

export function FormularioLogin() {
  const [estado, accion, pendiente] = useActionState(iniciarSesion, ESTADO_INICIAL)

  return (
    <form action={accion} className="flex flex-col gap-5">
      {estado?.error && (
        <Alert variant="destructive">
          <AlertDescription>{estado.error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder="tu@restaurante.com"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </div>

      <Button type="submit" disabled={pendiente} className="w-full">
        {pendiente ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Entrando…
          </>
        ) : (
          <>
            <LogIn className="size-4" />
            Entrar al panel
          </>
        )}
      </Button>
    </form>
  )
}
