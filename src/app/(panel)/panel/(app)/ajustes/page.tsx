import { Settings } from 'lucide-react'
import type { Metadata } from 'next'

import { FormularioAjustes } from '@/components/panel/ajustes/formulario-ajustes'
import { EncabezadoPagina } from '@/components/panel/encabezado-pagina'
import { requireRol } from '@/lib/auth'
import { obtenerAjustes } from '@/lib/payload'

export const metadata: Metadata = { title: 'Ajustes' }

export default async function AjustesPage() {
  await requireRol('admin', 'gerente')
  const ajustes = await obtenerAjustes()

  return (
    <div>
      <EncabezadoPagina
        titulo="Ajustes del restaurante"
        descripcion="Marca, moneda, impuestos, propinas, lealtad y textos de la carta. Todo lo que ves aquí se refleja en la operación y en la carta pública."
        icono={Settings}
      />
      <FormularioAjustes ajustes={ajustes} />
    </div>
  )
}
