import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminOrSelf, isAdminOrGerente } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: 'Empleado',
    plural: 'Empleados y accesos',
  },
  admin: {
    useAsTitle: 'nombre',
    defaultColumns: ['nombre', 'email', 'rol', 'puesto', 'activo'],
    group: 'Personal',
  },
  auth: {
    tokenExpiration: 60 * 60 * 12,
  },
  access: {
    read: isAdminOrSelf,
    create: isAdminOrGerente,
    update: isAdminOrSelf,
    delete: isAdmin,
    admin: ({ req: { user } }) => ['admin', 'gerente'].includes((user as { rol?: string })?.rol ?? ''),
  },
  fields: [
    {
      name: 'nombre',
      type: 'text',
      required: true,
      label: 'Nombre',
    },
    {
      name: 'apellidos',
      type: 'text',
      label: 'Apellidos',
    },
    {
      name: 'rol',
      type: 'select',
      required: true,
      defaultValue: 'mesero',
      label: 'Rol en el sistema',
      saveToJWT: true,
      options: [
        { label: 'Administrador', value: 'admin' },
        { label: 'Gerente', value: 'gerente' },
        { label: 'Cajero', value: 'cajero' },
        { label: 'Mesero', value: 'mesero' },
        { label: 'Cocina', value: 'cocina' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'activo',
      type: 'checkbox',
      defaultValue: true,
      label: 'Activo',
      admin: { position: 'sidebar' },
    },
    {
      name: 'puesto',
      type: 'text',
      label: 'Puesto',
      admin: { description: 'Ej. Chef, Barista, Recepcionista' },
    },
    {
      name: 'telefono',
      type: 'text',
      label: 'Teléfono',
    },
    {
      name: 'tarifaHora',
      type: 'number',
      label: 'Tarifa por hora',
      min: 0,
      admin: { description: 'Costo por hora para el cálculo de nómina.' },
    },
    {
      name: 'fechaIngreso',
      type: 'date',
      label: 'Fecha de ingreso',
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
      label: 'Foto',
    },
    {
      name: 'notas',
      type: 'textarea',
      label: 'Notas internas',
    },
  ],
}
