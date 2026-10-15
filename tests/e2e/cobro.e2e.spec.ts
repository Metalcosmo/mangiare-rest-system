import { expect, test } from '@playwright/test'

/**
 * Al registrar un cobro, el diálogo notifica "Cobro registrado" y refresca los
 * datos del servidor. Si el efecto depende de una función con identidad nueva
 * en cada render, el refresco vuelve a dispararlo y las notificaciones se
 * multiplican sin fin.
 *
 * La prueba cobra un pedido propio y comprueba que sólo aparece una.
 */
const BASE = 'http://localhost:3000'

const CAJERA = { email: 'cajera@mangiare.mx', password: 'mangiare123' }

test.describe('Registro de cobro', () => {
  test('muestra una sola notificación al registrar el cobro', async ({ page }) => {
    await page.goto(`${BASE}/panel/login`)
    await page.fill('#email', CAJERA.email)
    await page.fill('#password', CAJERA.password)
    await page.getByRole('button', { name: /Entrar/ }).click()
    await page.waitForURL(`${BASE}/panel`)

    await page.goto(`${BASE}/panel/pos`)

    // Filtramos el catálogo para no depender del orden ni del scroll.
    await page
      .getByPlaceholder('Buscar platillo por nombre o descripción…')
      .fill('Ensalada César')

    // El primer botón con ese texto es la tarjeta del catálogo; las cuentas
    // abiertas se pintan más abajo.
    await page.locator('button').filter({ hasText: 'Ensalada César' }).first().click()

    // Mostrador no exige mesa; con «En mesa» el pedido se rechazaría.
    await page.getByRole('button', { name: 'Mostrador' }).first().click()

    // Crea el pedido y abre el diálogo de cobro con esa cuenta.
    await page.getByRole('button', { name: 'Cobrar ahora' }).click()

    const confirmar = page.getByRole('button', { name: 'Confirmar cobro' })
    await expect(confirmar).toBeVisible()
    await confirmar.click()

    const avisos = page.locator('[data-sonner-toast]')
    await expect(avisos.filter({ hasText: 'Cobro registrado' }).first()).toBeVisible()

    // Si el efecto se repitiera, aquí ya habría varias notificaciones apiladas.
    await page.waitForTimeout(3000)
    expect(await avisos.count()).toBeLessThanOrEqual(1)
  })
})
