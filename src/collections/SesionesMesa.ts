import type { CollectionConfig } from 'payload'

import { hasRol, isAdminOrGerente, isStaff } from '../access'

/**
 * Una sesión de mesa es la "cuenta abierta" de una mesa ocupada.
 *
 * - La abre la primera persona que escanea el QR: queda como **anfitrión** con
 *   su nombre y su cédula.
 * - Los demás se unen escribiendo la cédula del anfitrión y reciben el token de
 *   invitado.
 * - Sólo el anfitrión puede mandar el pedido al mesero; los invitados agregan y
 *   quitan platillos del pedido compartido.
 *
 * Se guardan **dos tokens independientes** a propósito: con uno solo más una
 * bandera de rol en la cookie, cualquiera podría abrir las herramientas del
 * navegador, leer la cookie y reemitirla como anfitrión. Al ser secretos
 * distintos, el invitado nunca puede fabricar la cookie del anfitrión.
 */
export const SesionesMesa: CollectionConfig = {
  slug: 'sesiones-mesa',
  labels: {
    singular: 'Sesión de mesa',
    plural: 'Sesiones de mesa',
  },
  admin: {
    useAsTitle: 'anfitrionNombre',
    defaultColumns: ['mesa', 'anfitrionNombre', 'estado', 'abiertaEn'],
    group: 'Salón y mesas',
    description:
      'Cuentas abiertas por los clientes desde el código QR. Se crean y se cierran solas.',
  },
  access: {
    // El personal la necesita para el salón, el POS y la sección del mesero.
    // La carta pública la lee con `overrideAccess` y nunca expone los tokens.
    read: isStaff,
    create: hasRol('admin', 'gerente', 'cajero', 'mesero'),
    update: hasRol('admin', 'gerente', 'cajero', 'mesero'),
    delete: isAdminOrGerente,
  },
  fields: [
    {
      name: 'mesa',
      type: 'relationship',
      relationTo: 'mesas',
      required: true,
      index: true,
      label: 'Mesa',
      admin: { position: 'sidebar' },
    },
    {
      name: 'anfitrionNombre',
      type: 'text',
      label: 'Anfitrión',
      admin: { description: 'Quien abrió la mesa.' },
    },
    {
      name: 'anfitrionCedula',
      type: 'text',
      index: true,
      label: 'Cédula del anfitrión',
      admin: { description: 'Normalizada: mayúsculas y sin puntos ni guiones.' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'tokenAnfitrion',
          type: 'text',
          label: 'Token del anfitrión',
          admin: { hidden: true },
        },
        {
          name: 'tokenInvitado',
          type: 'text',
          label: 'Token de invitado',
          admin: { hidden: true },
        },
      ],
    },
    {
      name: 'estado',
      type: 'select',
      required: true,
      defaultValue: 'abierta',
      index: true,
      label: 'Estado',
      options: [
        { label: 'Abierta', value: 'abierta' },
        { label: 'Cerrada', value: 'cerrada' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'origen',
      type: 'select',
      defaultValue: 'cliente',
      label: 'Abierta por',
      options: [
        { label: 'El cliente (QR)', value: 'cliente' },
        { label: 'Un mesero (POS)', value: 'mesero' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'motivoCierre',
      type: 'select',
      label: 'Motivo de cierre',
      admin: { readOnly: true, position: 'sidebar' },
      options: [
        { label: 'Cuenta cobrada', value: 'cobrada' },
        { label: 'Cerrada por el personal', value: 'manual' },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'abiertaEn',
          type: 'date',
          label: 'Abierta',
          admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
        },
        {
          name: 'cerradaEn',
          type: 'date',
          label: 'Cerrada',
          admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
        },
      ],
    },
    {
      name: 'cerradaPor',
      type: 'relationship',
      relationTo: 'users',
      label: 'Cerrada por',
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'notas',
      type: 'text',
      label: 'Notas',
    },
  ],
}
