import { expect, test } from '@playwright/test'

import { abrirMesa } from '../helpers/mesa'

/**
 * Carta pública: portada, carta de una mesa y mesa inexistente.
 *
 * Se usan las fixtures de Playwright (`page`), que crean y cierran un contexto
 * por prueba: así no queda ningún navegador vivo entre tests.
 */
test.describe('Carta pública', () => {
  test('la portada invita a escanear el código QR', async ({ page }) => {
    await page.goto('http://localhost:3000')

    await expect(page).toHaveTitle(/Mangiare/)
    await expect(page.locator('h1').first()).toHaveText('Mangiare')
    await expect(page.getByText('Estás en el restaurante')).toBeVisible()
  })

  test('la carta de una mesa muestra sus platillos', async ({ page }) => {
    // Cada mesa tiene su propia sesión: se usa una que no tocan otras pruebas.
    await abrirMesa(page, 'terraza-3', { nombre: 'Prueba Carta', cedula: 'V10000001' })

    await expect(page.getByText('Terraza 3')).toBeVisible()
    await expect(page.getByPlaceholder('Buscar en la carta…')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Pizza margarita' })).toBeVisible()
  })

  test('una mesa inexistente muestra un aviso amable', async ({ page }) => {
    await page.goto('http://localhost:3000/mesa/mesa-que-no-existe')

    await expect(page.getByText('No encontramos esta mesa')).toBeVisible()
  })
})
