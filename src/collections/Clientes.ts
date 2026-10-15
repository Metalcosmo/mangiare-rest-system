import type { CollectionConfig } from 'payload'

import { operacionDiaria } from '../access'
import { recalcularCliente } from '../hooks/clientes'

export const Clientes: CollectionConfig = {
  slug: 'clientes',
  labels: {
    singular: 'Cliente',
    plural: 'Clientes',
  },
  admin: {
    useAsTitle: 'nombre',
    defaultColumns: ['nombre', 'telefono', 'nivel', 'puntos', 'visitas', 'totalGastado'],
    group: 'CRM y lealtad',
  },
  access: operacionDiaria,
  fields: [
    { name: 'nombre', type: 'text', required: true, label: 'Nombre completo' },
    {
      type: 'row',
      fields: [
        { name: 'telefono', type: 'text', label: 'Teléfono', index: true },
        { name: 'email', type: 'email', label: 'Correo' },
      ],
    },
    {
      name: 'fechaNacimiento',
      type: 'date',
      label: 'Fecha de nacimiento',
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'puntos',
          type: 'number',
          defaultValue: 0,
          min: 0,
          label: 'Puntos acumulados',
        },
        {
          name: 'nivel',
          type: 'select',
          defaultValue: 'bronce',
          label: 'Nivel',
          options: [
            { label: 'Bronce', value: 'bronce' },
            { label: 'Plata', value: 'plata' },
            { label: 'Oro', value: 'oro' },
            { label: 'Platino', value: 'platino' },
          ],
          admin: { readOnly: true, description: 'Se calcula automáticamente.' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'visitas', type: 'number', defaultValue: 0, min: 0, label: 'Visitas' },
        { name: 'totalGastado', type: 'number', defaultValue: 0, min: 0, label: 'Gasto histórico' },
        {
          name: 'ticketPromedio',
          type: 'number',
          label: 'Ticket promedio',
          admin: { readOnly: true },
        },
      ],
    },
    {
      name: 'ultimaVisita',
      type: 'date',
      label: 'Última visita',
      admin: { readOnly: true },
    },
    {
      name: 'etiquetas',
      type: 'select',
      hasMany: true,
      label: 'Etiquetas',
      options: [
        { label: 'VIP', value: 'vip' },
        { label: 'Frecuente', value: 'frecuente' },
        { label: 'Nuevo', value: 'nuevo' },
        { label: 'Inactivo', value: 'inactivo' },
        { label: 'Cumpleaños este mes', value: 'cumpleanos' },
        { label: 'Corporativo', value: 'corporativo' },
        { label: 'Delivery', value: 'delivery' },
      ],
    },
    {
      name: 'aceptaMarketing',
      type: 'checkbox',
      defaultValue: true,
      label: 'Acepta recibir promociones',
    },
    { name: 'direccion', type: 'text', label: 'Dirección' },
    { name: 'notas', type: 'textarea', label: 'Notas y preferencias' },
  ],
  hooks: {
    beforeChange: [recalcularCliente],
  },
}
