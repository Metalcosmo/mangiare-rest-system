import { slugField } from 'payload'

type ArgsSlugify = { valueToSlugify?: unknown }

/**
 * Normaliza un texto a un slug apto para URL, respetando el español
 * (quita acentos y convierte la ñ en n).
 */
export const slugify = ({ valueToSlugify }: ArgsSlugify): string =>
  String(valueToSlugify ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

/**
 * Campo `slug` de Payload.
 *
 * En Payload 3.90 el tipo `slug` ya no existe en la unión `Field`: hay que
 * expandir el helper `slugField()`, que devuelve una fila con la casilla
 * oculta `generateSlug` y el campo de texto `slug`.
 */
export const campoSlug = (useAsSlug: string, position: 'sidebar' | undefined = 'sidebar') =>
  slugField({ useAsSlug, slugify, position })
