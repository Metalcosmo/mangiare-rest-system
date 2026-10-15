import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { gestion } from '../access'

/** Calcula las horas del turno a partir de la hora de entrada y salida. */
const calcularHoras: CollectionBeforeChangeHook = ({ data }) => {
  const inicio = data.horaInicio as string | undefined
  const fin = data.horaFin as string | undefined

  if (inicio && fin) {
    const [h1, m1] = inicio.split(':').map(Number)
    const [h2, m2] = fin.split(':').map(Number)
    if (![h1, m1, h2, m2].some((n) => Number.isNaN(n))) {
      let minutos = h2 * 60 + m2 - (h1 * 60 + m1)
      if (minutos < 0) minutos += 24 * 60
      data.horasTotales = Math.round((minutos / 60) * 100) / 100
    }
  }

  return data
}

export const Turnos: CollectionConfig = {
  slug: 'turnos',
  labels: {
    singular: 'Turno',
    plural: 'Turnos y horarios',
  },
  admin: {
    useAsTitle: 'empleado',
    defaultColumns: ['empleado', 'fecha', 'horaInicio', 'horaFin', 'puesto', 'estado'],
    group: 'Personal',
  },
  access: gestion,
  defaultSort: 'fecha',
  fields: [
    {
      name: 'empleado',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'Empleado',
      index: true,
    },
    {
      name: 'fecha',
      type: 'date',
      required: true,
      label: 'Fecha',
      index: true,
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'horaInicio',
          type: 'text',
          required: true,
          defaultValue: '09:00',
          label: 'Entrada',
        },
        {
          name: 'horaFin',
          type: 'text',
          required: true,
          defaultValue: '17:00',
          label: 'Salida',
        },
        {
          name: 'horasTotales',
          type: 'number',
          label: 'Horas',
          admin: { readOnly: true },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'puesto',
          type: 'select',
          required: true,
          defaultValue: 'mesero',
          label: 'Puesto del turno',
          options: [
            { label: 'Gerente', value: 'gerente' },
            { label: 'Cajero', value: 'cajero' },
            { label: 'Mesero', value: 'mesero' },
            { label: 'Cocina', value: 'cocina' },
            { label: 'Barra', value: 'barra' },
            { label: 'Anfitrión', value: 'anfitrion' },
          ],
        },
        {
          name: 'estado',
          type: 'select',
          required: true,
          defaultValue: 'programado',
          label: 'Estado',
          options: [
            { label: 'Programado', value: 'programado' },
            { label: 'Confirmado', value: 'confirmado' },
            { label: 'Completado', value: 'completado' },
            { label: 'Ausente', value: 'ausente' },
          ],
        },
      ],
    },
    { name: 'notas', type: 'text', label: 'Notas' },
  ],
  hooks: {
    beforeChange: [calcularHoras],
  },
}
