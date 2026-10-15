import type { CollectionConfig } from 'payload'

import { catalogoPublico } from '../access'
import { UNIDADES } from '../lib/unidades'

export const gruposModificadoresOpciones = {
  name: 'opciones',
  type: 'array' as const,
  label: 'Opciones',
  minRows: 1,
  fields: [
    { name: 'nombre', type: 'text' as const, required: true, label: 'Nombre' },
    { name: 'precioExtra', type: 'number' as const, defaultValue: 0, label: 'Precio extra' },
    { name: 'porDefecto', type: 'checkbox' as const, defaultValue: false, label: 'Marcada por defecto' },
    { name: 'disponible', type: 'checkbox' as const, defaultValue: true, label: 'Disponible' },
  ],
}

export const GruposModificadores: CollectionConfig = {
  slug: 'grupos-modificadores',
  labels: {
    singular: 'Grupo de opciones',
    plural: 'Opciones y modificadores',
  },
  admin: {
    useAsTitle: 'nombre',
    defaultColumns: ['nombre', 'tipo', 'obligatorio'],
    group: 'Carta y menú',
  },
  access: catalogoPublico,
  fields: [
    {
      name: 'nombre',
      type: 'text',
      required: true,
      label: 'Nombre del grupo',
      admin: { description: 'Ej. "Término de la carne", "Extras", "Elige tu bebida"' },
    },
    {
      name: 'descripcion',
      type: 'text',
      label: 'Ayuda para el cliente',
    },
    {
      name: 'tipo',
      type: 'select',
      required: true,
      defaultValue: 'unica',
      label: 'Tipo de selección',
      options: [
        { label: 'Selección única', value: 'unica' },
        { label: 'Selección múltiple', value: 'multiple' },
      ],
    },
    {
      name: 'obligatorio',
      type: 'checkbox',
      defaultValue: false,
      label: 'Obligatorio',
    },
    {
      type: 'row',
      fields: [
        { name: 'minSelecciones', type: 'number', defaultValue: 0, label: 'Mínimo a elegir' },
        { name: 'maxSelecciones', type: 'number', defaultValue: 1, label: 'Máximo a elegir' },
      ],
    },
    {
      name: 'unidadReferencia',
      type: 'select',
      options: UNIDADES,
      label: 'Unidad de referencia (opcional)',
      admin: { description: 'Sólo informativo para recetas.' },
    },
    gruposModificadoresOpciones,
  ],
}
