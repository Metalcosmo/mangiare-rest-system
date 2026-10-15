import type { GlobalConfig } from 'payload'

import { anyone, isAdminOrGerente } from '../access'

export const Ajustes: GlobalConfig = {
  slug: 'ajustes',
  label: 'Ajustes del restaurante',
  admin: {
    group: 'Configuración',
  },
  access: {
    // La carta pública necesita conocer marca, moneda e impuestos.
    read: anyone,
    update: isAdminOrGerente,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Identidad',
          fields: [
            {
              name: 'nombreComercial',
              type: 'text',
              required: true,
              defaultValue: 'Mangiare',
              label: 'Nombre comercial',
            },
            {
              name: 'eslogan',
              type: 'text',
              label: 'Eslogan',
            },
            {
              name: 'logo',
              type: 'upload',
              relationTo: 'media',
              label: 'Logotipo',
            },
            {
              name: 'colorPrimario',
              type: 'text',
              defaultValue: '#c2410c',
              label: 'Color primario',
              admin: { description: 'Formato hexadecimal, ej. #c2410c' },
            },
            {
              name: 'colorSecundario',
              type: 'text',
              defaultValue: '#1c1917',
              label: 'Color secundario',
            },
            {
              name: 'telefono',
              type: 'text',
              label: 'Teléfono',
            },
            {
              name: 'email',
              type: 'email',
              label: 'Correo de contacto',
            },
            {
              name: 'direccion',
              type: 'text',
              label: 'Dirección',
            },
            {
              name: 'instagram',
              type: 'text',
              label: 'Instagram',
            },
          ],
        },
        {
          label: 'Operación',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'moneda',
                  type: 'select',
                  defaultValue: 'MXN',
                  label: 'Moneda',
                  options: [
                    { label: 'Peso mexicano (MXN)', value: 'MXN' },
                    { label: 'Peso colombiano (COP)', value: 'COP' },
                    { label: 'Peso argentino (ARS)', value: 'ARS' },
                    { label: 'Euro (EUR)', value: 'EUR' },
                    { label: 'Dólar (USD)', value: 'USD' },
                    { label: 'Sol peruano (PEN)', value: 'PEN' },
                    { label: 'Peso chileno (CLP)', value: 'CLP' },
                  ],
                },
                {
                  name: 'simboloMoneda',
                  type: 'text',
                  defaultValue: '$',
                  label: 'Símbolo',
                },
                {
                  name: 'impuestoPorcentaje',
                  type: 'number',
                  defaultValue: 16,
                  label: '% de impuesto',
                },
              ],
            },
            {
              name: 'impuestoIncluido',
              type: 'checkbox',
              defaultValue: true,
              label: 'Los precios de la carta ya incluyen impuesto',
            },
            {
              name: 'servicioPorcentaje',
              type: 'number',
              defaultValue: 0,
              label: '% de servicio sugerido',
            },
            {
              name: 'propinasSugeridas',
              type: 'array',
              label: 'Propinas sugeridas (%)',
              defaultValue: [{ valor: 10 }, { valor: 15 }, { valor: 20 }],
              fields: [{ name: 'valor', type: 'number', required: true }],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'puntosPorUnidad',
                  type: 'number',
                  defaultValue: 1,
                  label: 'Puntos por unidad de moneda',
                  admin: { description: 'Ej. 1 = un punto por cada $1 gastado.' },
                },
                {
                  name: 'valorPunto',
                  type: 'number',
                  defaultValue: 0.1,
                  label: 'Valor de cada punto',
                },
                {
                  name: 'tiempoEstimadoMinutos',
                  type: 'number',
                  defaultValue: 25,
                  label: 'Tiempo de preparación (min)',
                },
              ],
            },
            {
              name: 'aceptaPedidos',
              type: 'checkbox',
              defaultValue: true,
              label: 'Aceptar pedidos en línea',
            },
            {
              name: 'requiereAprobacionMesa',
              type: 'checkbox',
              defaultValue: true,
              label: 'El mesero confirma los pedidos de mesa',
              admin: {
                description:
                  'Si está activo, un pedido hecho por el cliente desde el código QR no llega a cocina hasta que un mesero lo aprueba. Los pedidos que levanta el personal siempre van directo a cocina.',
              },
            },
            {
              name: 'aforoMaximo',
              type: 'number',
              defaultValue: 80,
              label: 'Aforo máximo',
            },
            {
              name: 'horarios',
              type: 'array',
              label: 'Horarios de atención',
              fields: [
                {
                  name: 'dia',
                  type: 'select',
                  required: true,
                  options: [
                    { label: 'Lunes', value: 'lunes' },
                    { label: 'Martes', value: 'martes' },
                    { label: 'Miércoles', value: 'miercoles' },
                    { label: 'Jueves', value: 'jueves' },
                    { label: 'Viernes', value: 'viernes' },
                    { label: 'Sábado', value: 'sabado' },
                    { label: 'Domingo', value: 'domingo' },
                  ],
                },
                { name: 'abre', type: 'text', defaultValue: '13:00' },
                { name: 'cierra', type: 'text', defaultValue: '23:00' },
                { name: 'cerrado', type: 'checkbox', defaultValue: false },
              ],
            },
          ],
        },
        {
          label: 'Carta pública',
          fields: [
            {
              name: 'mensajeBienvenida',
              type: 'textarea',
              defaultValue: 'Bienvenido. Explora nuestra carta y ordena directo desde tu mesa.',
              label: 'Mensaje de bienvenida',
            },
            {
              name: 'mensajePie',
              type: 'text',
              defaultValue: 'Gracias por tu visita',
              label: 'Mensaje al pie',
            },
            {
              name: 'notaServicio',
              type: 'textarea',
              label: 'Nota operativa visible al cliente',
              admin: { description: 'Ej. "El servicio puede tardar un poco más hoy".' },
            },
            {
              name: 'permitirPropinaCliente',
              type: 'checkbox',
              defaultValue: true,
              label: 'Permitir al cliente dejar propina al ordenar',
            },
          ],
        },
        {
          label: 'Tickets',
          fields: [
            {
              name: 'encabezadoTicket',
              type: 'textarea',
              label: 'Encabezado del ticket',
            },
            {
              name: 'pieTicket',
              type: 'textarea',
              defaultValue: '¡Gracias por su visita!',
              label: 'Pie del ticket',
            },
            {
              name: 'identificacionFiscal',
              type: 'text',
              label: 'Identificación fiscal (RFC / NIT / CUIT)',
            },
          ],
        },
      ],
    },
  ],
}
