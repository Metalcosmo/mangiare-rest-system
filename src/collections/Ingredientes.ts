import type { CollectionConfig } from 'payload'

import { catalogoPublico } from '../access'
import { UNIDADES } from '../lib/unidades'

export const Ingredientes: CollectionConfig = {
  slug: 'ingredientes',
  labels: {
    singular: 'Ingrediente',
    plural: 'Inventario de ingredientes',
  },
  admin: {
    useAsTitle: 'nombre',
    defaultColumns: ['nombre', 'stockActual', 'unidad', 'stockMinimo', 'costoUnitario'],
    group: 'Inventario',
  },
  access: catalogoPublico,
  fields: [
    { name: 'nombre', type: 'text', required: true, label: 'Nombre' },
    {
      name: 'sku',
      type: 'text',
      label: 'Código interno (SKU)',
      admin: { position: 'sidebar' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'unidad',
          type: 'select',
          required: true,
          defaultValue: 'unidad',
          label: 'Unidad de inventario',
          options: UNIDADES,
        },
        {
          name: 'categoria',
          type: 'select',
          defaultValue: 'abarrote',
          label: 'Familia',
          options: [
            { label: 'Abarrote', value: 'abarrote' },
            { label: 'Carnes', value: 'carnes' },
            { label: 'Verduras y frutas', value: 'vegetales' },
            { label: 'Lácteos', value: 'lacteos' },
            { label: 'Bebidas', value: 'bebidas' },
            { label: 'Desechables', value: 'desechables' },
            { label: 'Limpieza', value: 'limpieza' },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'stockActual',
          type: 'number',
          defaultValue: 0,
          label: 'Existencia actual',
          admin: { description: 'Se actualiza automáticamente con cada movimiento.' },
        },
        {
          name: 'stockMinimo',
          type: 'number',
          defaultValue: 0,
          label: 'Mínimo deseado',
        },
        {
          name: 'stockMaximo',
          type: 'number',
          defaultValue: 0,
          label: 'Máximo',
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'costoUnitario',
          type: 'number',
          defaultValue: 0,
          min: 0,
          label: 'Costo por unidad',
          admin: { description: 'Costo de una unidad de inventario.' },
        },
        {
          name: 'proveedor',
          type: 'relationship',
          relationTo: 'proveedores',
          label: 'Proveedor principal',
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'ubicacion', type: 'text', label: 'Ubicación en almacén' },
        { name: 'perecedero', type: 'checkbox', defaultValue: false, label: 'Perecedero' },
        { name: 'vidaUtilDias', type: 'number', min: 0, label: 'Vida útil (días)' },
      ],
    },
    {
      name: 'valorInventario',
      type: 'number',
      virtual: true,
      label: 'Valor en almacén',
      admin: { readOnly: true },
      hooks: {
        afterRead: [
          ({ siblingData }) =>
            Math.round(
              ((siblingData?.stockActual ?? 0) * (siblingData?.costoUnitario ?? 0) + Number.EPSILON) *
                100,
            ) / 100,
        ],
      },
    },
    { name: 'activo', type: 'checkbox', defaultValue: true, label: 'Activo', admin: { position: 'sidebar' } },
  ],
}
