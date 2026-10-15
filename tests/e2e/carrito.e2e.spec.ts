import { expect, test } from '@playwright/test'

import { abrirMesa, prepararMesa } from '../helpers/mesa'

/**
 * El carrito de la carta pública es un panel de altura fija con cabecera, lista
 * desplazable y pie. Si la lista no se puede encoger (`min-h-0`), crece hasta su
 * altura de contenido, desborda el panel y empuja el botón de enviar fuera de la
 * pantalla: el cliente no puede mandar su pedido.
 *
 * Se reproduce con un teléfono pequeño y varias líneas para forzar el desborde.
 */
const PRODUCTOS = ['Ensalada César', 'Bruschetta della casa', 'Carpaccio de res', 'Tiramisú de la casa']

test.use({ viewport: { width: 390, height: 640 } })

test.describe('Carrito de la carta pública', () => {
  test('el botón de enviar queda visible aunque el pedido sea largo', async ({ page, request }) => {
    await prepararMesa(request, 'mesa-6')
    await abrirMesa(page, 'mesa-6', { nombre: 'Prueba Carrito', cedula: 'V20000002' })

    // Cada producto sin grupos de opciones va al pedido de la mesa y abre el
    // panel. Agregar es una ida al servidor, así que esperamos a que el panel
    // aparezca antes de cerrarlo: si no, el siguiente clic cae detrás.
    for (const [indice, nombre] of PRODUCTOS.entries()) {
      await page
        .locator('article')
        .filter({ hasText: nombre })
        .getByRole('button', { name: 'Agregar', exact: true })
        .click()

      await expect(page.locator('[data-slot="sheet-content"]')).toBeVisible()

      if (indice < PRODUCTOS.length - 1) {
        await page.keyboard.press('Escape')
        await expect(page.locator('[data-slot="sheet-content"]')).toBeHidden()
      }
    }

    const enviar = page.getByRole('button', { name: /Enviar pedido/ })
    await expect(enviar).toBeVisible()

    // Esperamos a que termine la animación de entrada del panel para medir en firme.
    await page
      .locator('[data-slot="sheet-content"]')
      .evaluate((nodo) => Promise.all(nodo.getAnimations().map((animacion) => animacion.finished)))

    // La lista tiene que desplazarse de verdad, no recortarse.
    const seDesplaza = await page
      .locator('[data-slot="scroll-area-viewport"]')
      .first()
      .evaluate((nodo) => nodo.scrollHeight > nodo.clientHeight)
    expect(seDesplaza).toBe(true)

    // Y el botón tiene que caer dentro del panel y dentro de la pantalla.
    const viewport = page.viewportSize()
    const panel = await page.locator('[data-slot="sheet-content"]').boundingBox()
    const boton = await enviar.boundingBox()

    expect(viewport).not.toBeNull()
    expect(panel).not.toBeNull()
    expect(boton).not.toBeNull()
    expect(boton!.y + boton!.height).toBeLessThanOrEqual(panel!.y + panel!.height + 1)
    expect(boton!.y + boton!.height).toBeLessThanOrEqual(viewport!.height + 1)
  })

  test('una pizza se configura con su talla y cobra el extra', async ({ page }) => {
    await abrirMesa(page, 'mesa-7', { nombre: 'Prueba Pizza', cedula: 'V30000003' })

    await page
      .locator('article')
      .filter({ hasText: 'Pizza margarita' })
      .getByRole('button', { name: 'Agregar', exact: true })
      .click()

    const dialogo = page.getByRole('dialog')
    await expect(dialogo).toBeVisible()

    // El grupo obligatorio de talla se ofrece, con «Chica» marcada por defecto.
    await expect(dialogo.getByText('Talla')).toBeVisible()
    await expect(dialogo.getByText('Chica')).toBeVisible()

    // Una opción marcada como agotada no se ofrece en la carta.
    await expect(dialogo.getByText('Piña')).toHaveCount(0)

    const confirmar = dialogo.getByRole('button', { name: /^Agregar ·/ })
    const importe = async () =>
      Number((await confirmar.textContent())?.replace(/[^\d.]/g, '') ?? 0)

    const antes = await importe()
    await dialogo.getByText('Grande', { exact: true }).click()
    const despues = await importe()

    // La talla grande suma su precio de catálogo (80).
    expect(despues - antes).toBe(80)

    await confirmar.click()

    // El carrito conserva la variación elegida junto al platillo.
    const hoja = page.locator('[data-slot="sheet-content"]')
    await expect(hoja.getByText('Pizza margarita')).toBeVisible()
    await expect(hoja.getByText('Grande')).toBeVisible()
  })
})
