import type { CollectionConfig } from 'payload'

import { catalogoPublico } from '../access'
import { campoSlug } from '../lib/slug'
import { calcularCostoReceta } from '../hooks/productos'
import { UNIDADES } from '../lib/unidades'

export const Productos: CollectionConfig = {
  slug: 'productos',
  labels: {
    singular: 'Platillo',
    plural: 'Carta de platillos y bebidas',
  },
  admin: {
    useAsTitle: 'nombre',
    defaultColumns: ['nombre', 'categoria', 'precio', 'disponible', 'estacion'],
    group: 'Carta y menú',
  },
  access: catalogoPublico,
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Información',
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
              label: 'Descripción para el cliente',
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'categoria',
                  type: 'relationship',
                  relationTo: 'categorias',
                  required: true,
                  label: 'Categoría',
                  index: true,
                },
                {
                  name: 'estacion',
                  type: 'select',
                  required: true,
                  defaultValue: 'cocina',
                  label: 'Estación de preparación',
                  index: true,
                  admin: { description: 'Determina en qué pantalla del KDS aparece.' },
                  options: [
                    { label: 'Cocina', value: 'cocina' },
                    { label: 'Parrilla', value: 'parrilla' },
                    { label: 'Barra', value: 'barra' },
                    { label: 'Postres', value: 'postres' },
                    { label: 'Mostrador', value: 'mostrador' },
                  ],
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'precio',
                  type: 'number',
                  required: true,
                  min: 0,
                  label: 'Precio de venta',
                  index: true,
                },
                {
                  name: 'precioPromocional',
                  type: 'number',
                  min: 0,
                  label: 'Precio promocional',
                  admin: { description: 'Si se define, se muestra como oferta.' },
                },
              ],
            },
            {
              name: 'imagen',
              type: 'upload',
              relationTo: 'media',
              label: 'Fotografía',
            },
            {
              name: 'etiquetas',
              type: 'select',
              hasMany: true,
              label: 'Etiquetas',
              options: [
                { label: 'Vegetariano', value: 'vegetariano' },
                { label: 'Vegano', value: 'vegano' },
                { label: 'Sin gluten', value: 'sin_gluten' },
                { label: 'Sin lactosa', value: 'sin_lactosa' },
                { label: 'Picante', value: 'picante' },
                { label: 'Recomendado', value: 'recomendado' },
                { label: 'Nuevo', value: 'nuevo' },
              ],
            },
            {
              name: 'alergenos',
              type: 'select',
              hasMany: true,
              label: 'Alérgenos',
              options: [
                { label: 'Gluten', value: 'gluten' },
                { label: 'Lácteos', value: 'lacteos' },
                { label: 'Huevo', value: 'huevo' },
                { label: 'Frutos secos', value: 'frutos_secos' },
                { label: 'Mariscos', value: 'mariscos' },
                { label: 'Pescado', value: 'pescado' },
                { label: 'Soya', value: 'soya' },
              ],
            },
          ],
        },
        {
          label: 'Receta y costo',
          description:
            'Define los ingredientes que consume una porción para descontar inventario y calcular el costo real.',
          fields: [
            {
              name: 'receta',
              type: 'array',
              label: 'Ingredientes',
              admin: { description: 'La cantidad se expresa en la unidad que elijas.' },
              fields: [
                {
                  name: 'ingrediente',
                  type: 'relationship',
                  relationTo: 'ingredientes',
                  required: true,
                  label: 'Ingrediente',
                },
                { name: 'cantidad', type: 'number', required: true, min: 0, label: 'Cantidad' },
                {
                  name: 'unidad',
                  type: 'select',
                  options: UNIDADES,
                  label: 'Unidad',
                  admin: { description: 'Se convierte automáticamente a la unidad del inventario.' },
                },
                { name: 'notas', type: 'text', label: 'Notas' },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'costoReceta',
                  type: 'number',
                  label: 'Costo de ingredientes',
                  admin: {
                    readOnly: true,
                    description: 'Se calcula solo a partir de la receta y el costo del inventario.',
                  },
                },
                {
                  name: 'rendimiento',
                  type: 'number',
                  defaultValue: 1,
                  min: 1,
                  label: 'Porciones que rinde',
                  admin: { description: 'Sirve para repartir el costo de una preparación base.' },
                },
              ],
            },
            {
              name: 'controlaStock',
              type: 'checkbox',
              defaultValue: true,
              label: 'Descontar ingredientes del inventario al vender',
            },
          ],
        },
        {
          label: 'Opciones',
          fields: [
            {
              name: 'gruposModificadores',
              type: 'relationship',
              relationTo: 'grupos-modificadores',
              hasMany: true,
              label: 'Grupos de opciones',
              admin: { description: 'Ej. término de cocción, extras, elección de bebida.' },
            },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Visibilidad y tiempos',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'disponible',
              type: 'checkbox',
              defaultValue: true,
              label: 'Disponible',
              index: true,
              admin: { position: 'sidebar' },
            },
            {
              name: 'destacado',
              type: 'checkbox',
              defaultValue: false,
              label: 'Destacado',
              admin: { position: 'sidebar' },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'tiempoPreparacion',
              type: 'number',
              defaultValue: 10,
              min: 0,
              label: 'Minutos de preparación',
            },
            { name: 'orden', type: 'number', defaultValue: 0, label: 'Orden en la carta' },
          ],
        },
        {
          name: 'sku',
          type: 'text',
          label: 'Código interno (SKU)',
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [calcularCostoReceta],
  },
}
