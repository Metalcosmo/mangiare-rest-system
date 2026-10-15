import type { CollectionAfterChangeHook, CollectionConfig } from 'payload'

import { gestion } from '../access'
import { aplicarMovimientoAlStock } from '../lib/inventario'

/**
 * Cuando un movimiento se crea desde el panel (no desde el POS) aplicamos
 * el efecto sobre la existencia. Los movimientos generados por el sistema
 * ya vienen con `stockYaAplicado` para no duplicar el descuento.
 */
const aplicarAlInventario: CollectionAfterChangeHook = async ({
  doc,
  req,
  context,
  operation,
}) => {
  if (operation !== 'create') return doc
  if (context?.stockYaAplicado) return doc

  const ingrediente =
    typeof doc.ingrediente === 'object' ? doc.ingrediente?.id : doc.ingrediente

  if (!ingrediente) return doc

  await aplicarMovimientoAlStock({
    payload: req.payload,
    ingredienteId: ingrediente,
    tipo: doc.tipo,
    cantidad: doc.cantidad ?? 0,
    req,
  })

  return doc
}

export const MovimientosInventario: CollectionConfig = {
  slug: 'movimientos-inventario',
  labels: {
    singular: 'Movimiento de inventario',
    plural: 'Movimientos de inventario',
  },
  admin: {
    useAsTitle: 'motivo',
    defaultColumns: ['ingrediente', 'tipo', 'cantidad', 'fecha'],
    group: 'Inventario',
  },
  access: gestion,
  defaultSort: '-fecha',
  fields: [
    {
      name: 'ingrediente',
      type: 'relationship',
      relationTo: 'ingredientes',
      required: true,
      label: 'Ingrediente',
      index: true,
    },
    {
      name: 'tipo',
      type: 'select',
      required: true,
      defaultValue: 'entrada',
      label: 'Tipo de movimiento',
      index: true,
      options: [
        { label: 'Entrada (compra)', value: 'entrada' },
        { label: 'Salida manual', value: 'salida' },
        { label: 'Ajuste de existencia', value: 'ajuste' },
        { label: 'Merma', value: 'merma' },
        { label: 'Consumo por venta', value: 'consumo' },
        { label: 'Devolución', value: 'devolucion' },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'cantidad',
          type: 'number',
          required: true,
          label: 'Cantidad',
          admin: { description: 'En "ajuste" es la existencia final deseada.' },
        },
        { name: 'costoUnitario', type: 'number', min: 0, label: 'Costo unitario' },
      ],
    },
    { name: 'motivo', type: 'text', label: 'Motivo' },
    {
      name: 'pedido',
      type: 'relationship',
      relationTo: 'pedidos',
      label: 'Pedido relacionado',
      admin: { readOnly: true },
    },
    {
      name: 'usuario',
      type: 'relationship',
      relationTo: 'users',
      label: 'Registrado por',
    },
    {
      name: 'fecha',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      label: 'Fecha',
      index: true,
    },
  ],
  hooks: {
    afterChange: [aplicarAlInventario],
  },
}
