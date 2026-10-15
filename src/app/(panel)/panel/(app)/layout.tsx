import type { ReactNode } from 'react'

import { Shell } from '@/components/panel/shell'
import { requireUsuario } from '@/lib/auth'
import { getPayloadClient, obtenerAjustes } from '@/lib/payload'
import { nombreCompleto } from '@/lib/roles'

/** Roles que pueden confirmar pedidos de mesa: ver `ROLES_REVISION`. */
const ROLES_APRUEBAN = ['admin', 'gerente', 'cajero', 'mesero']

export default async function PanelAppLayout({ children }: { children: ReactNode }) {
  const [usuario, ajustes] = await Promise.all([requireUsuario(), obtenerAjustes()])

  // Contador del badge de navegación. Sólo consultamos si el rol puede aprobar.
  let pedidosPorConfirmar = 0
  if (ROLES_APRUEBAN.includes(usuario.rol ?? '')) {
    const payload = await getPayloadClient()
    const { totalDocs } = await payload.count({
      collection: 'pedidos',
      where: { estado: { equals: 'por_confirmar' } },
      overrideAccess: true,
    })
    pedidosPorConfirmar = totalDocs
  }

  return (
    <Shell
      usuario={{
        nombre: nombreCompleto(usuario),
        email: usuario.email,
        rol: usuario.rol ?? 'mesero',
        puesto: usuario.puesto,
      }}
      marca={{
        nombre: ajustes.nombreComercial ?? 'Mangiare',
        colorPrimario: ajustes.colorPrimario ?? '#c2410c',
        colorSecundario: ajustes.colorSecundario ?? '#1c1917',
      }}
      contadores={{ pedidosPorConfirmar }}
    >
      {children}
    </Shell>
  )
}
