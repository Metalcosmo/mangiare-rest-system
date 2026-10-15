'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { getPayloadClient } from '@/lib/payload'

const COOKIE = 'payload-token'

export type EstadoLogin = { error?: string }

/** Inicia sesión contra la colección `users` y guarda la cookie de Payload. */
export async function iniciarSesion(
  _estado: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Escribe tu correo y tu contraseña.' }
  }

  const payload = await getPayloadClient()
  let token: string | undefined
  let maxAge = 60 * 60 * 12
  // Un mesero aterriza en su propia sección, no en el tablero de gerencia.
  let destino = '/panel'

  try {
    const resultado = await payload.login({
      collection: 'users',
      data: { email, password },
    })
    token = resultado?.token ?? undefined
    if (resultado?.exp) {
      maxAge = Math.max(60, resultado.exp - Math.floor(Date.now() / 1000))
    }
    if ((resultado?.user as { rol?: string } | null)?.rol === 'mesero') {
      destino = '/panel/mesero'
    }
  } catch {
    return { error: 'Correo o contraseña incorrectos.' }
  }

  if (!token) {
    return { error: 'No pudimos iniciar tu sesión. Intenta de nuevo.' }
  }

  const store = await cookies()
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge,
  })

  redirect(destino)
}

export async function cerrarSesion(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE)
  redirect('/panel/login')
}
