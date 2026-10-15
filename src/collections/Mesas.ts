import type { CollectionConfig } from 'payload'

import { anyone, hasRol } from '../access'
import { campoSlug } from '../lib/slug'

/**
 * Cada mesa tiene un `slug` que es el que viaja en el código QR.
 * La carta pública resuelve la mesa por ese slug: /mesa/<slug>
 */
export const Mesas: CollectionConfig = {
  slug: 'mesas',
  labels: {
    singular: 'Mesa',
    plural: 'Mesas',
  },
  admin: {
    useAsTitle: 'nombre',
    defaultColumns: ['nombre', 'slug', 'zona', 'capacidad', 'estado'],
    group: 'Salón y mesas',
  },
  access: {
    // La carta pública necesita leer la mesa para resolver el QR.
    read: anyone,
    create: hasRol('admin', 'gerente'),
    // El salón lo opera todo el piso: meseros y cajeros cambian estados.
    update: hasRol('admin', 'gerente', 'cajero', 'mesero'),
    delete: hasRol('admin', 'gerente'),
  },
  fields: [
    {
      name: 'nombre',
      type: 'text',
      required: true,
      label: 'Nombre',
      admin: { description: 'Ej. "Mesa 5", "Barra 2", "Terraza 1"' },
    },
    campoSlug('nombre'),
    {
      name: 'zona',
      type: 'relationship',
      relationTo: 'zonas',
      label: 'Zona',
      index: true,
    },
    {
      type: 'row',
      fields: [
        { name: 'capacidad', type: 'number', defaultValue: 4, min: 1, label: 'Capacidad' },
        {
          name: 'forma',
          type: 'select',
          defaultValue: 'cuadrada',
          label: 'Forma',
          options: [
            { label: 'Cuadrada', value: 'cuadrada' },
            { label: 'Redonda', value: 'redonda' },
            { label: 'Rectangular', value: 'rectangular' },
            { label: 'Barra', value: 'barra' },
          ],
        },
      ],
    },
    {
      name: 'estado',
      type: 'select',
      required: true,
      defaultValue: 'libre',
      label: 'Estado',
      index: true,
      options: [
        { label: 'Libre', value: 'libre' },
        { label: 'Ocupada', value: 'ocupada' },
        { label: 'Reservada', value: 'reservada' },
        { label: 'Por limpiar', value: 'limpieza' },
        { label: 'Fuera de servicio', value: 'fuera_servicio' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'activa',
      type: 'checkbox',
      defaultValue: true,
      label: 'Activa',
      admin: { position: 'sidebar' },
    },
    {
      type: 'collapsible',
      label: 'Posición en el mapa del salón',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'posicionX',
              type: 'number',
              defaultValue: 0,
              label: 'Posición horizontal',
              admin: { description: 'Porcentaje del ancho (0-100).' },
            },
            {
              name: 'posicionY',
              type: 'number',
              defaultValue: 0,
              label: 'Posición vertical',
              admin: { description: 'Porcentaje del alto (0-100).' },
            },
          ],
        },
      ],
    },
    {
      name: 'notas',
      type: 'text',
      label: 'Notas',
    },
  ],
}
