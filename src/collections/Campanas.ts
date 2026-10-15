import type { CollectionConfig } from 'payload'

import { gestion } from '../access'

export const Campanas: CollectionConfig = {
  slug: 'campanas',
  labels: {
    singular: 'Campaña',
    plural: 'Campañas de marketing',
  },
  admin: {
    useAsTitle: 'nombre',
    defaultColumns: ['nombre', 'canal', 'segmento', 'estado', 'enviados'],
    group: 'Marketing',
  },
  access: gestion,
  fields: [
    { name: 'nombre', type: 'text', required: true, label: 'Nombre de la campaña' },
    {
      type: 'row',
      fields: [
        {
          name: 'canal',
          type: 'select',
          required: true,
          defaultValue: 'email',
          label: 'Canal',
          options: [
            { label: 'Correo electrónico', value: 'email' },
            { label: 'SMS', value: 'sms' },
            { label: 'WhatsApp', value: 'whatsapp' },
            { label: 'Push', value: 'push' },
          ],
        },
        {
          name: 'segmento',
          type: 'select',
          required: true,
          defaultValue: 'todos',
          label: 'Segmento objetivo',
          options: [
            { label: 'Todos los clientes', value: 'todos' },
            { label: 'VIP', value: 'vip' },
            { label: 'Frecuentes', value: 'frecuente' },
            { label: 'Inactivos (+60 días)', value: 'inactivo' },
            { label: 'Cumpleaños del mes', value: 'cumpleanos' },
            { label: 'Nuevos (1 visita)', value: 'nuevo' },
          ],
        },
      ],
    },
    { name: 'asunto', type: 'text', label: 'Asunto (correo)' },
    {
      name: 'mensaje',
      type: 'textarea',
      label: 'Mensaje',
      admin: { description: 'Puedes usar {nombre} para personalizar.' },
    },
    {
      name: 'cupon',
      type: 'relationship',
      relationTo: 'cupones',
      label: 'Cupón incluido',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'estado',
          type: 'select',
          required: true,
          defaultValue: 'borrador',
          label: 'Estado',
          options: [
            { label: 'Borrador', value: 'borrador' },
            { label: 'Programada', value: 'programada' },
            { label: 'Enviada', value: 'enviada' },
            { label: 'Cancelada', value: 'cancelada' },
          ],
        },
        {
          name: 'programadaPara',
          type: 'date',
          label: 'Programada para',
          admin: { date: { pickerAppearance: 'dayAndTime' } },
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Resultados',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'enviados', type: 'number', defaultValue: 0, min: 0, label: 'Enviados' },
            { name: 'aperturas', type: 'number', defaultValue: 0, min: 0, label: 'Aperturas' },
            { name: 'clics', type: 'number', defaultValue: 0, min: 0, label: 'Clics' },
            { name: 'conversiones', type: 'number', defaultValue: 0, min: 0, label: 'Conversiones' },
          ],
        },
        {
          name: 'ingresosGenerados',
          type: 'number',
          defaultValue: 0,
          min: 0,
          label: 'Ingresos atribuidos',
        },
      ],
    },
  ],
}
