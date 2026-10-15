import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  CalendarClock,
  ChefHat,
  ClipboardList,
  CreditCard,
  HandPlatter,
  LayoutGrid,
  Megaphone,
  Package,
  Settings,
  Table2,
  Users,
  UsersRound,
  UtensilsCrossed,
} from 'lucide-react'

import type { ClavePermiso } from '@/lib/roles'

export type ItemNav = {
  href: string
  etiqueta: string
  icono: LucideIcon
  /** Clave de `puedeVer` en lib/roles para filtrar por rol. */
  permiso: ClavePermiso
  descripcion?: string
  /** Clave del contador pendiente que se pinta como badge (ver `ContadoresNav`). */
  contador?: ClaveContador
}

/** Contadores en vivo que el layout calcula y la navegación muestra. */
export type ContadoresNav = {
  pedidosPorConfirmar?: number
}

export type ClaveContador = keyof ContadoresNav

export type GrupoNav = {
  grupo: string
  items: ItemNav[]
}

export const NAVEGACION: GrupoNav[] = [
  {
    grupo: 'Operación',
    items: [
      {
        href: '/panel',
        etiqueta: 'Tablero',
        icono: BarChart3,
        permiso: 'pedidos',
        descripcion: 'Resumen del día',
      },
      {
        href: '/panel/mesero',
        etiqueta: 'Mi servicio',
        icono: HandPlatter,
        permiso: 'mesero',
        descripcion: 'Mesas, pedidos por confirmar y toma de pedido',
        contador: 'pedidosPorConfirmar',
      },
      {
        href: '/panel/pos',
        etiqueta: 'Punto de venta',
        icono: CreditCard,
        permiso: 'pos',
        descripcion: 'Levantar pedidos y cobrar',
      },
      {
        href: '/panel/kds',
        etiqueta: 'Pantalla de cocina',
        icono: ChefHat,
        permiso: 'kds',
        descripcion: 'KDS por estación',
      },
      {
        href: '/panel/pedidos',
        etiqueta: 'Pedidos',
        icono: ClipboardList,
        permiso: 'pedidos',
        descripcion: 'Historial y seguimiento',
      },
    ],
  },
  {
    grupo: 'Salón',
    items: [
      {
        href: '/panel/salon',
        etiqueta: 'Mapa de sala',
        icono: LayoutGrid,
        permiso: 'salon',
        descripcion: 'Estado de las mesas',
      },
      {
        href: '/panel/mesas',
        etiqueta: 'Mesas y QR',
        icono: Table2,
        permiso: 'salon',
        descripcion: 'Códigos QR por mesa',
      },
      {
        href: '/panel/reservas',
        etiqueta: 'Reservaciones',
        icono: CalendarClock,
        permiso: 'reservas',
        descripcion: 'Agenda y asignación',
      },
    ],
  },
  {
    grupo: 'Carta e inventario',
    items: [
      {
        href: '/panel/carta',
        etiqueta: 'Carta y menú',
        icono: UtensilsCrossed,
        permiso: 'carta',
        descripcion: 'Platillos, categorías y recetas',
      },
      {
        href: '/panel/inventario',
        etiqueta: 'Inventario',
        icono: Package,
        permiso: 'inventario',
        descripcion: 'Existencias y movimientos',
      },
    ],
  },
  {
    grupo: 'Clientes y equipo',
    items: [
      {
        href: '/panel/clientes',
        etiqueta: 'Clientes y lealtad',
        icono: UsersRound,
        permiso: 'clientes',
        descripcion: 'CRM, puntos y recompensas',
      },
      {
        href: '/panel/marketing',
        etiqueta: 'Marketing',
        icono: Megaphone,
        permiso: 'marketing',
        descripcion: 'Campañas y cupones',
      },
      {
        href: '/panel/personal',
        etiqueta: 'Personal y turnos',
        icono: Users,
        permiso: 'personal',
        descripcion: 'Equipo y horarios',
      },
    ],
  },
  {
    grupo: 'Configuración',
    items: [
      {
        href: '/panel/ajustes',
        etiqueta: 'Ajustes',
        icono: Settings,
        permiso: 'ajustes',
        descripcion: 'Marca, impuestos y propinas',
      },
    ],
  },
]
