import type { Access, CollectionConfig, FieldAccess } from 'payload'

/**
 * Roles disponibles en el sistema.
 * - admin: dueño / acceso total
 * - gerente: operación completa salvo usuarios y ajustes críticos
 * - cajero: POS, cobros y clientes
 * - mesero: salón, pedidos y reservas
 * - cocina: KDS e inventario
 */
export type Rol = 'admin' | 'gerente' | 'cajero' | 'mesero' | 'cocina'

const rolDe = (user: unknown): Rol | undefined => (user as { rol?: Rol } | null)?.rol

/** Sólo administradores (dueños del negocio). */
export const isAdmin: Access = ({ req: { user } }) => rolDe(user) === 'admin'

/** Administradores y gerentes. */
export const isAdminOrGerente: Access = ({ req: { user } }) =>
  ['admin', 'gerente'].includes(rolDe(user) ?? '')

/** Cualquier miembro del personal autenticado. */
export const isStaff: Access = ({ req: { user } }) => Boolean(user)

/** Lectura abierta al público (carta digital, mesas, ajustes públicos). */
export const anyone: Access = () => true

/** Acceso restringido a una lista de roles. */
export const hasRol =
  (...roles: Rol[]): Access =>
  ({ req: { user } }) => {
    const rol = rolDe(user)
    return rol ? roles.includes(rol) : false
  }

/** Versión a nivel de campo (sólo devuelve booleano). */
export const hasRolField =
  (...roles: Rol[]): FieldAccess =>
  ({ req: { user } }) => {
    const rol = rolDe(user)
    return rol ? roles.includes(rol) : false
  }

/** Un empleado puede leer/editar su propio registro, los gerentes todos. */
export const isAdminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false
  if (['admin', 'gerente'].includes(rolDe(user) ?? '')) return true
  return { id: { equals: user.id } }
}

/**
 * Patrón habitual en catálogo: lectura pública y escritura para el equipo.
 */
export const catalogoPublico: CollectionConfig['access'] = {
  read: anyone,
  create: hasRol('admin', 'gerente', 'cocina'),
  update: hasRol('admin', 'gerente', 'cocina'),
  delete: hasRol('admin', 'gerente'),
}

/** Operación diaria (pedidos, reservas, clientes): todo el personal opera, sólo gerencia borra. */
export const operacionDiaria: CollectionConfig['access'] = {
  read: isStaff,
  create: hasRol('admin', 'gerente', 'cajero', 'mesero'),
  update: hasRol('admin', 'gerente', 'cajero', 'mesero', 'cocina'),
  delete: isAdminOrGerente,
}

/** Datos sensibles de negocio (inventario, personal, marketing). */
export const gestion: CollectionConfig['access'] = {
  read: isStaff,
  create: isAdminOrGerente,
  update: isAdminOrGerente,
  delete: isAdmin,
}
