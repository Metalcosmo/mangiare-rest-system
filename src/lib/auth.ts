import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { getPayloadClient } from './payload'
import type { Rol, UsuarioPanel } from './roles'

export type { Rol, UsuarioPanel } from './roles'
export { ETIQUETA_ROL, nombreCompleto, puedeVer } from './roles'

/** Sesión actual del panel, o null si no hay sesión válida. */
export async function usuarioActual(): Promise<UsuarioPanel | null> {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  return (user as UsuarioPanel | null) ?? null
}

/** Igual que `usuarioActual` pero redirige al login si no hay sesión. */
export async function requireUsuario(): Promise<UsuarioPanel> {
  const user = await usuarioActual()
  if (!user) redirect('/panel/login')
  return user
}

/** Restringe una sección a ciertos roles. */
export async function requireRol(...roles: Rol[]): Promise<UsuarioPanel> {
  const user = await requireUsuario()
  if (user.rol && !roles.includes(user.rol)) redirect('/panel')
  return user
}
