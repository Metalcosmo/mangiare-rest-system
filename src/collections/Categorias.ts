import type { CollectionConfig } from 'payload'

import { catalogoPublico } from '../access'
import { campoSlug } from '../lib/slug'

export const Categorias: CollectionConfig = {
  slug: 'categorias',
  labels: {
    singular: 'Categoría',
    plural: 'Categorías de la carta',
  },
  admin: {
    useAsTitle: 'nombre',
    defaultColumns: ['nombre', 'orden', 'activa'],
    group: 'Carta y menú',
  },
  access: catalogoPublico,
  fields: [
    {
      name: 'nombre',
      type: 'text',
      required: true,
      label: 'Nombre',
    },
    campoSlug('nombre'),
    {
      name: 'descripcion',
      type: 'textarea',
      label: 'Descripción',
    },
    {
      name: 'icono',
      type: 'text',
      label: 'Ícono',
      admin: { description: 'Un emoji, ej. 🍕 o 🍹' },
    },
    {
      name: 'imagen',
      type: 'upload',
      relationTo: 'media',
      label: 'Imagen de portada',
    },
    {
      name: 'orden',
      type: 'number',
      defaultValue: 0,
      label: 'Orden de aparición',
      index: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'activa',
      type: 'checkbox',
      defaultValue: true,
      label: 'Visible en la carta',
      index: true,
      admin: { position: 'sidebar' },
    },
  ],
}
