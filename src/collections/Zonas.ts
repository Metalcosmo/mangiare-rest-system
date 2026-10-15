import type { CollectionConfig } from 'payload'

import { catalogoPublico } from '../access'

export const Zonas: CollectionConfig = {
  slug: 'zonas',
  labels: {
    singular: 'Zona del salón',
    plural: 'Zonas del salón',
  },
  admin: {
    useAsTitle: 'nombre',
    defaultColumns: ['nombre', 'orden', 'activa'],
    group: 'Salón y mesas',
  },
  access: catalogoPublico,
  fields: [
    { name: 'nombre', type: 'text', required: true, label: 'Nombre' },
    {
      name: 'descripcion',
      type: 'text',
      label: 'Descripción',
      admin: { description: 'Ej. Terraza, Salón principal, Barra, Segundo piso' },
    },
    {
      name: 'color',
      type: 'text',
      defaultValue: '#0ea5e9',
      label: 'Color en el mapa',
    },
    { name: 'orden', type: 'number', defaultValue: 0, label: 'Orden' },
    { name: 'activa', type: 'checkbox', defaultValue: true, label: 'Activa' },
  ],
}
