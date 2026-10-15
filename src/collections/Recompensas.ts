import type { CollectionConfig } from 'payload'

import { catalogoPublico } from '../access'

export const Recompensas: CollectionConfig = {
  slug: 'recompensas',
  labels: {
    singular: 'Recompensa',
    plural: 'Catálogo de recompensas',
  },
  admin: {
    useAsTitle: 'nombre',
    defaultColumns: ['nombre', 'tipo', 'costoPuntos', 'activa'],
    group: 'CRM y lealtad',
  },
  access: catalogoPublico,
  fields: [
    { name: 'nombre', type: 'text', required: true, label: 'Nombre' },
    { name: 'descripcion', type: 'textarea', label: 'Descripción' },
    {
      type: 'row',
      fields: [
        {
          name: 'tipo',
          type: 'select',
          required: true,
          defaultValue: 'producto_gratis',
          label: 'Tipo de recompensa',
          options: [
            { label: 'Platillo gratis', value: 'producto_gratis' },
            { label: 'Descuento por porcentaje', value: 'descuento_porcentaje' },
            { label: 'Descuento por monto', value: 'descuento_monto' },
            { label: 'Puntos extra', value: 'puntos_extra' },
          ],
        },
        {
          name: 'costoPuntos',
          type: 'number',
          required: true,
          defaultValue: 100,
          min: 1,
          label: 'Puntos necesarios',
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'valorDescuento',
          type: 'number',
          min: 0,
          label: 'Valor del descuento',
          admin: {
            condition: (_data, siblingData) =>
              ['descuento_porcentaje', 'descuento_monto', 'puntos_extra'].includes(
                siblingData?.tipo ?? '',
              ),
            description: 'Porcentaje o monto según el tipo.',
          },
        },
        {
          name: 'producto',
          type: 'relationship',
          relationTo: 'productos',
          label: 'Platillo',
          admin: {
            condition: (_data, siblingData) => siblingData?.tipo === 'producto_gratis',
          },
        },
      ],
    },
    { name: 'imagen', type: 'upload', relationTo: 'media', label: 'Imagen' },
    {
      type: 'row',
      fields: [
        {
          name: 'vigenciaDesde',
          type: 'date',
          label: 'Vigente desde',
          admin: { date: { pickerAppearance: 'dayOnly' } },
        },
        {
          name: 'vigenciaHasta',
          type: 'date',
          label: 'Vigente hasta',
          admin: { date: { pickerAppearance: 'dayOnly' } },
        },
      ],
    },
    {
      name: 'activa',
      type: 'checkbox',
      defaultValue: true,
      label: 'Activa',
      admin: { position: 'sidebar' },
    },
  ],
}
