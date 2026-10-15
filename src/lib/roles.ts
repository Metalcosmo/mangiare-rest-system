/**
 * Utilidades de rol compartidas entre servidor y cliente.
 * No importar aquí nada de `next/headers`.
 */
export type Rol = 'admin' | 'gerente' | 'cajero' | 'mesero' | 'cocina'

export type UsuarioPanel = {
  id: string | number
  email: string
  nombre?: string | null
  apellidos?: string | null
  rol?: Rol | null
  puesto?: string | null
  activo?: boolean | null
  avatar?: unknown
}

export const ETIQUETA_ROL: Record<string, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  cajero: 'Cajero',
  mesero: 'Mesero',
  cocina: 'Cocina',
}

export const nombreCompleto = (user?: UsuarioPanel | null): string =>
  [user?.nombre, user?.apellidos].filter(Boolean).join(' ') || user?.email || 'Usuario'

/** Secciones del panel y los roles que pueden verlas. */
export const puedeVer: Record<string, Rol[]> = {
  mesero: ['admin', 'gerente', 'cajero', 'mesero'],
  pos: ['admin', 'gerente', 'cajero', 'mesero'],
  kds: ['admin', 'gerente', 'cajero', 'cocina', 'mesero'],
  pedidos: ['admin', 'gerente', 'cajero', 'mesero'],
  carta: ['admin', 'gerente'],
  inventario: ['admin', 'gerente', 'cocina'],
  personal: ['admin', 'gerente'],
  clientes: ['admin', 'gerente', 'cajero', 'mesero'],
  marketing: ['admin', 'gerente'],
  reservas: ['admin', 'gerente', 'mesero'],
  salon: ['admin', 'gerente', 'mesero', 'cajero'],
  ajustes: ['admin', 'gerente'],
}

export type ClavePermiso = keyof typeof puedeVer

export const tienePermiso = (rol: string | null | undefined, clave: ClavePermiso): boolean => {
  if (!rol) return false
  return (puedeVer[clave] ?? []).includes(rol as Rol)
}
