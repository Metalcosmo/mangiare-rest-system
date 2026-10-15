import type { CollectionConfig } from 'payload'

import { catalogoPublico } from '../access'

export const Proveedores: CollectionConfig = {
  slug: 'proveedores',
  labels: {
    singular: 'Proveedor',
    plural: 'Proveedores',
  },
  admin: {
    useAsTitle: 'nombre',
    defaultColumns: ['nombre', 'contacto', 'telefono', 'activo'],
    group: 'Inventario',
  },
  access: catalogoPublico,
  fields: [
    { name: 'nombre', type: 'text', required: true, label: 'Nombre' },
    { name: 'contacto', type: 'text', label: 'Persona de contacto' },
    {
      type: 'row',
      fields: [
        { name: 'telefono', type: 'text', label: 'Teléfono' },
        { name: 'email', type: 'email', label: 'Correo' },
      ],
    },
    { name: 'direccion', type: 'text', label: 'Dirección' },
    {
      name: 'condicionesPago',
      type: 'select',
      defaultValue: 'contado',
      label: 'Condiciones de pago',
      options: [
        { label: 'Contado', value: 'contado' },
        { label: '15 días', value: '15_dias' },
        { label: '30 días', value: '30_dias' },
        { label: '60 días', value: '60_dias' },
      ],
    },
    { name: 'diasEntrega', type: 'text', label: 'Días de entrega' },
    { name: 'notas', type: 'textarea', label: 'Notas' },
    { name: 'activo', type: 'checkbox', defaultValue: true, label: 'Activo', admin: { position: 'sidebar' } },
  ],
}
