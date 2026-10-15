import type { CollectionAfterChangeHook, CollectionConfig } from 'payload'

import { operacionDiaria } from '../access'
import { idCrudo } from '../lib/ids'

/** Al sentar una reserva la mesa pasa a ocupada; al cancelarla se libera. */
const sincronizarMesa: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  const mesaId = idCrudo(doc.mesa)
  if (!mesaId) return doc

  const estado = doc.estado
  const anterior = (previousDoc as { estado?: string } | undefined)?.estado
  if (estado === anterior) return doc

  if (estado === 'sentada') {
    await req.payload.update({
      collection: 'mesas',
      id: mesaId,
      data: { estado: 'ocupada' },
      overrideAccess: true,
      req,
    })
    return doc
  }

  if (estado === 'cancelada' || estado === 'no_asistio') {
    const mesa = (await req.payload.findByID({
      collection: 'mesas',
      id: mesaId,
      depth: 0,
      overrideAccess: true,
      req,
    })) as { estado?: string } | null

    if (mesa?.estado === 'reservada' || mesa?.estado === 'ocupada') {
      await req.payload.update({
        collection: 'mesas',
        id: mesaId,
        data: { estado: 'libre' },
        overrideAccess: true,
        req,
      })
    }
  }

  return doc
}

export const Reservaciones: CollectionConfig = {
  slug: 'reservaciones',
  labels: {
    singular: 'Reservación',
    plural: 'Reservaciones',
  },
  admin: {
    useAsTitle: 'nombreCliente',
    defaultColumns: ['nombreCliente', 'fecha', 'hora', 'personas', 'mesa', 'estado'],
    group: 'Reservas y salón',
  },
  access: operacionDiaria,
  defaultSort: 'fecha',
  fields: [
    { name: 'nombreCliente', type: 'text', required: true, label: 'Nombre del cliente' },
    {
      name: 'cliente',
      type: 'relationship',
      relationTo: 'clientes',
      label: 'Cliente registrado',
    },
    {
      type: 'row',
      fields: [
        { name: 'telefono', type: 'text', label: 'Teléfono' },
        { name: 'email', type: 'email', label: 'Correo' },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'fecha',
          type: 'date',
          required: true,
          label: 'Fecha',
          index: true,
          admin: { date: { pickerAppearance: 'dayOnly' } },
        },
        {
          name: 'hora',
          type: 'text',
          required: true,
          defaultValue: '20:00',
          label: 'Hora',
          admin: { description: 'Formato 24h, ej. 20:30' },
        },
        { name: 'personas', type: 'number', required: true, defaultValue: 2, min: 1, label: 'Personas' },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'mesa',
          type: 'relationship',
          relationTo: 'mesas',
          label: 'Mesa asignada',
        },
        {
          name: 'zona',
          type: 'relationship',
          relationTo: 'zonas',
          label: 'Zona preferida',
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'estado',
          type: 'select',
          required: true,
          defaultValue: 'pendiente',
          label: 'Estado',
          index: true,
          options: [
            { label: 'Pendiente', value: 'pendiente' },
            { label: 'Confirmada', value: 'confirmada' },
            { label: 'Cliente en mesa', value: 'sentada' },
            { label: 'Completada', value: 'completada' },
            { label: 'Cancelada', value: 'cancelada' },
            { label: 'No se presentó', value: 'no_asistio' },
          ],
        },
        {
          name: 'ocasion',
          type: 'select',
          label: 'Ocasión',
          options: [
            { label: 'Ninguna en especial', value: 'ninguna' },
            { label: 'Cumpleaños', value: 'cumpleanos' },
            { label: 'Aniversario', value: 'aniversario' },
            { label: 'Comida de negocios', value: 'negocios' },
            { label: 'Celebración', value: 'celebracion' },
          ],
        },
      ],
    },
    {
      name: 'notas',
      type: 'textarea',
      label: 'Notas y peticiones especiales',
    },
    {
      name: 'creadaPor',
      type: 'relationship',
      relationTo: 'users',
      label: 'Registrada por',
      admin: { readOnly: true },
    },
  ],
  hooks: {
    afterChange: [sincronizarMesa],
  },
}
