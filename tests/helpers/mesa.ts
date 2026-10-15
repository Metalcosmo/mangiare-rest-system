import { expect, type APIRequestContext, type Page } from '@playwright/test'

export const BASE = 'http://localhost:3000'

const ADMIN = { email: 'admin@mangiare.mx', password: 'mangiare123' }

export type IdentidadMesa = {
  nombre: string
  cedula: string
}

/**
 * Cierra la sesión abierta de una mesa para que la prueba pueda **abrirla** de
 * nuevo y quedar como anfitriona.
 *
 * Hace falta porque el rol de una sesión no se hereda: quien llega a una mesa ya
 * abierta entra como invitado y no puede mandar el pedido al mesero. Se corre
 * con la API REST de Payload (el personal tiene permiso), sin tocar la base a
 * mano, así que la suite se puede repetir sin re-sembrar.
 */
export async function prepararMesa(request: APIRequestContext, slug: string): Promise<void> {
  const acceso = await request.post(`${BASE}/api/users/login`, { data: ADMIN })
  const { token } = (await acceso.json()) as { token: string }
  const headers = { Authorization: `JWT ${token}` }

  const consulta =
    `limit=100&where[and][0][estado][equals]=abierta&where[and][1][mesa.slug][equals]=${slug}`
  const respuesta = await request.get(`${BASE}/api/sesiones-mesa?${consulta}`, { headers })
  const { docs } = (await respuesta.json()) as { docs: Array<{ id: string | number }> }

  for (const sesion of docs ?? []) {
    await request.patch(`${BASE}/api/sesiones-mesa/${sesion.id}`, {
      headers,
      data: { estado: 'cerrada', motivoCierre: 'manual' },
    })
  }

  // Un borrador de una sesión cerrada ya no lo puede mandar nadie, pero la
  // interfaz lo sigue contando como «sin enviar» sobre la mesa.
  const borradores = await request.get(
    `${BASE}/api/pedidos?limit=100&where[and][0][mesa.slug][equals]=${slug}&where[and][1][estado][equals]=borrador`,
    { headers },
  )
  const { docs: sueltos } = (await borradores.json()) as { docs: Array<{ id: string | number }> }

  for (const pedido of sueltos ?? []) {
    await request.delete(`${BASE}/api/pedidos/${pedido.id}`, { headers })
  }
}

/**
 * Deja a la página dentro de la carta de una mesa.
 *
 * Es **idempotente** a propósito: si la mesa ya tiene una sesión abierta (de una
 * corrida anterior de las pruebas), entra con la cédula en lugar de intentar
 * abrirla otra vez. Así la suite se puede repetir sin limpiar la base.
 */
export async function abrirMesa(
  page: Page,
  slug: string,
  identidad: IdentidadMesa,
): Promise<void> {
  await page.goto(`${BASE}/mesa/${slug}`)

  const abrir = page.getByRole('button', { name: 'Abrir la mesa' })
  const unir = page.getByRole('button', { name: 'Unirme a la mesa' })
  const reclamar = page.getByRole('button', { name: 'Identificarme' })

  await expect(abrir.or(unir).or(reclamar)).toBeVisible()

  if (await abrir.isVisible()) {
    await page.getByLabel('Tu nombre').fill(identidad.nombre)
    await page.getByLabel('Tu cédula').fill(identidad.cedula)
    await abrir.click()
  } else if (await reclamar.isVisible()) {
    await page.getByLabel('Tu nombre').fill(identidad.nombre)
    await page.getByLabel('Tu cédula').fill(identidad.cedula)
    await reclamar.click()
  } else {
    await page.getByLabel('Cédula del anfitrión').fill(identidad.cedula)
    await unir.click()
  }

  await expect(page.getByPlaceholder('Buscar en la carta…')).toBeVisible()
}
