import type { CollectionConfig } from 'payload'

import { catalogoPublico } from '../access'

export const Cupones: CollectionConfig = {
  slug: 'cupones',
  labels: {
    singular: 'Cupón',
    plural: 'Cupones y descuentos',
  },
  admin: {
    useAsTitle: 'codigo',
    defaultColumns: ['codigo', 'tipo', 'valor', 'usosActuales', 'usosMaximos', 'activo'],
    group: 'CRM y lealtad',
  },
  access: catalogoPublico,
  fields: [
    {
      name: 'codigo',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Código',
      admin: { description: 'Lo que el cliente escribe, ej. BIENVENIDO10' },
    },
    { name: 'descripcion', type: 'text', label: 'Descripción' },
    {
      type: 'row',
      fields: [
        {
          name: 'tipo',
          type: 'select',
          required: true,
          defaultValue: 'porcentaje',
          label: 'Tipo',
          options: [
            { label: 'Porcentaje', value: 'porcentaje' },
            { label: 'Monto fijo', value: 'monto' },
          ],
        },
        { name: 'valor', type: 'number', required: true, min: 0, label: 'Valor' },
        { name: 'minimoCompra', type: 'number', defaultValue: 0, min: 0, label: 'Compra mínima' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'usosMaximos', type: 'number', defaultValue: 0, min: 0, label: 'Usos máximos (0 = ilimitado)' },
        {
          name: 'usosActuales',
          type: 'number',
          defaultValue: 0,
          min: 0,
          label: 'Usos acumulados',
          admin: { readOnly: true },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'validoDesde',
          type: 'date',
          label: 'Válido desde',
          admin: { date: { pickerAppearance: 'dayOnly' } },
        },
        {
          name: 'validoHasta',
          type: 'date',
          label: 'Válido hasta',
          admin: { date: { pickerAppearance: 'dayOnly' } },
        },
      ],
    },
    {
      name: 'canales',
      type: 'select',
      hasMany: true,
      label: 'Canales aplicables',
      options: [
        { label: 'En mesa', value: 'mesa' },
        { label: 'Mostrador', value: 'mostrador' },
        { label: 'Para llevar', value: 'para_llevar' },
      ],
    },
    {
      name: 'activo',
      type: 'checkbox',
      defaultValue: true,
      label: 'Activo',
      admin: { position: 'sidebar' },
    },
  ],
}
