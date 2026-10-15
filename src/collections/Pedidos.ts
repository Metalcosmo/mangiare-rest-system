import type { CollectionConfig } from 'payload'

import { operacionDiaria } from '../access'
import { efectosDePedido, prepararPedido } from '../hooks/pedidos'

export const Pedidos: CollectionConfig = {
  slug: 'pedidos',
  labels: {
    singular: 'Pedido',
    plural: 'Pedidos',
  },
  admin: {
    useAsTitle: 'folio',
    defaultColumns: ['folio', 'canal', 'estado', 'total', 'createdAt'],
    group: 'Pedidos',
  },
  access: operacionDiaria,
  fields: [
    {
      name: 'folio',
      type: 'text',
      unique: true,
      index: true,
      label: 'Folio',
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'canal',
      type: 'select',
      required: true,
      defaultValue: 'mesa',
      index: true,
      label: 'Canal',
      options: [
        { label: 'En mesa (QR)', value: 'mesa' },
        { label: 'Mostrador', value: 'mostrador' },
        { label: 'Para llevar', value: 'para_llevar' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'estado',
      type: 'select',
      required: true,
      defaultValue: 'nuevo',
      index: true,
      label: 'Estado',
      options: [
        { label: 'Borrador (sin enviar)', value: 'borrador' },
        { label: 'Por confirmar (mesero)', value: 'por_confirmar' },
        { label: 'Nuevo', value: 'nuevo' },
        { label: 'En preparación', value: 'en_preparacion' },
        { label: 'Listo', value: 'listo' },
        { label: 'Servido', value: 'servido' },
        { label: 'Pagado', value: 'pagado' },
        { label: 'Cancelado', value: 'cancelado' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'mesa',
      type: 'relationship',
      relationTo: 'mesas',
      label: 'Mesa',
      index: true,
      admin: {
        position: 'sidebar',
        condition: (data) => data?.canal === 'mesa',
      },
    },
    {
      name: 'comensales',
      type: 'number',
      defaultValue: 1,
      min: 1,
      label: 'Comensales',
      admin: {
        position: 'sidebar',
        condition: (data) => data?.canal === 'mesa',
      },
    },
    {
      name: 'sesion',
      type: 'relationship',
      relationTo: 'sesiones-mesa',
      label: 'Sesión de mesa',
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Cuenta abierta a la que pertenece este pedido.',
        condition: (data) => data?.canal === 'mesa',
      },
    },
    {
      name: 'ronda',
      type: 'number',
      label: 'Ronda',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Número de comanda dentro de la sesión.',
        condition: (data) => data?.canal === 'mesa',
      },
    },
    {
      name: 'turno',
      type: 'select',
      defaultValue: 'comida',
      label: 'Turno',
      options: [
        { label: 'Desayuno', value: 'desayuno' },
        { label: 'Comida', value: 'comida' },
        { label: 'Cena', value: 'cena' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Contenido',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'clienteNombre',
                  type: 'text',
                  label: 'Nombre del cliente',
                },
                {
                  name: 'clienteTelefono',
                  type: 'text',
                  label: 'Teléfono del cliente',
                },
              ],
            },
            {
              name: 'cliente',
              type: 'relationship',
              relationTo: 'clientes',
              label: 'Cliente registrado',
            },
            {
              name: 'mesero',
              type: 'relationship',
              relationTo: 'users',
              label: 'Atendido por',
            },
            {
              name: 'items',
              type: 'array',
              label: 'Platillos',
              minRows: 1,
              required: true,
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'producto',
                      type: 'relationship',
                      relationTo: 'productos',
                      required: true,
                      label: 'Platillo',
                    },
                    {
                      name: 'cantidad',
                      type: 'number',
                      required: true,
                      defaultValue: 1,
                      min: 1,
                      label: 'Cantidad',
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'nombre',
                      type: 'text',
                      label: 'Nombre al momento de la venta',
                      admin: { readOnly: true },
                    },
                    {
                      name: 'precioUnitario',
                      type: 'number',
                      label: 'Precio unitario',
                      admin: { readOnly: true, description: 'Se toma del catálogo al guardar.' },
                    },
                    {
                      name: 'estacion',
                      type: 'select',
                      label: 'Estación',
                      options: [
                        { label: 'Cocina', value: 'cocina' },
                        { label: 'Parrilla', value: 'parrilla' },
                        { label: 'Barra', value: 'barra' },
                        { label: 'Postres', value: 'postres' },
                        { label: 'Mostrador', value: 'mostrador' },
                      ],
                      admin: { readOnly: true },
                    },
                  ],
                },
                {
                  name: 'modificadores',
                  type: 'array',
                  label: 'Opciones elegidas',
                  fields: [
                    { name: 'nombre', type: 'text', required: true, label: 'Opción' },
                    { name: 'precioExtra', type: 'number', defaultValue: 0, label: 'Extra' },
                  ],
                },
                { name: 'notas', type: 'text', label: 'Notas para cocina' },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'estadoItem',
                      type: 'select',
                      defaultValue: 'pendiente',
                      label: 'Estado',
                      options: [
                        { label: 'Pendiente', value: 'pendiente' },
                        { label: 'Preparando', value: 'preparando' },
                        { label: 'Listo', value: 'listo' },
                      ],
                    },
                    {
                      name: 'subtotal',
                      type: 'number',
                      label: 'Subtotal',
                      admin: { readOnly: true },
                    },
                  ],
                },
              ],
            },
            { name: 'notas', type: 'textarea', label: 'Notas generales' },
          ],
        },
        {
          label: 'Cobro',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'subtotal', type: 'number', label: 'Subtotal', admin: { readOnly: true } },
                { name: 'descuento', type: 'number', defaultValue: 0, min: 0, label: 'Descuento' },
                { name: 'impuesto', type: 'number', label: 'Impuesto', admin: { readOnly: true } },
                { name: 'propina', type: 'number', defaultValue: 0, min: 0, label: 'Propina' },
                { name: 'total', type: 'number', label: 'Total', admin: { readOnly: true } },
              ],
            },
            {
              name: 'costoEstimado',
              type: 'number',
              label: 'Costo estimado de ingredientes',
              admin: { readOnly: true },
            },
            {
              name: 'cupon',
              type: 'relationship',
              relationTo: 'cupones',
              label: 'Cupón aplicado',
            },
            {
              name: 'pagos',
              type: 'array',
              label: 'Pagos',
              fields: [
                {
                  name: 'metodo',
                  type: 'select',
                  required: true,
                  defaultValue: 'efectivo',
                  label: 'Método',
                  options: [
                    { label: 'Efectivo', value: 'efectivo' },
                    { label: 'Tarjeta', value: 'tarjeta' },
                    { label: 'Transferencia', value: 'transferencia' },
                    { label: 'Puntos de lealtad', value: 'puntos' },
                    { label: 'Cortesía', value: 'cortesia' },
                  ],
                },
                { name: 'monto', type: 'number', required: true, min: 0, label: 'Monto' },
                { name: 'propina', type: 'number', defaultValue: 0, min: 0, label: 'Propina incluida' },
                { name: 'referencia', type: 'text', label: 'Referencia / autorización' },
                { name: 'fecha', type: 'date', label: 'Fecha del pago' },
              ],
            },
          ],
        },
        {
          label: 'Seguimiento',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'horaEnvioCocina',
                  type: 'date',
                  label: 'Enviado a cocina',
                  admin: { readOnly: true },
                },
                { name: 'horaListo', type: 'date', label: 'Listo', admin: { readOnly: true } },
                { name: 'horaEntrega', type: 'date', label: 'Entregado', admin: { readOnly: true } },
                { name: 'horaCobro', type: 'date', label: 'Cobrado', admin: { readOnly: true } },
              ],
            },
            {
              name: 'horaRecogida',
              type: 'date',
              label: 'Hora de recogida estimada',
              admin: { condition: (data) => data?.canal === 'para_llevar' },
            },
            {
              name: 'motivoCancelacion',
              type: 'text',
              label: 'Motivo de cancelación',
              admin: { condition: (data) => data?.estado === 'cancelado' },
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [prepararPedido],
    afterChange: [efectosDePedido],
  },
}
