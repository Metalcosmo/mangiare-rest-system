import { expect, test } from '@playwright/test'

import { abrirMesa, prepararMesa } from '../helpers/mesa'

/**
 * Flujo del mesero: un pedido hecho por el cliente desde el QR no llega a
 * cocina hasta que el mesero lo aprueba.
 *
 * Es una sola prueba larga a propósito: en un equipo de 8 GB cada contexto de
 * navegador y cada login cuestan, y este recorrido necesita una sesión de
 * mesero de principio a fin.
 */
const BASE = 'http://localhost:3000'

const MESERO = {
  email: 'mesero@mangiare.mx',
  password: 'mangiare123',
}

test.describe('Sección del mesero', () => {
  test('el cliente pide desde la mesa y el mesero aprueba antes de cocina', async ({
    page,
    request,
  }) => {
    // ── 1. El cliente abre la mesa y ordena desde el QR ─────────────────────
    await prepararMesa(request, 'mesa-2')
    await abrirMesa(page, 'mesa-2', { nombre: 'Prueba Mesero', cedula: 'V40000004' })

    // «Ensalada César» no tiene grupos de opciones: agregarla no abre diálogo.
    const tarjeta = page.locator('article').filter({ hasText: 'Ensalada César' })
    await tarjeta.getByRole('button', { name: 'Agregar', exact: true }).click()

    // Sólo el anfitrión puede mandarla: el botón está en el pie del panel.
    await page.getByRole('button', { name: /Enviar pedido al mesero/ }).click()

    await expect(
      page.locator('[data-sonner-toast]').filter({ hasText: /Un mesero lo confirmará/ }).first(),
    ).toBeVisible()

    // El panel se cierra al enviar: se vuelve a abrir para leer la ronda.
    await page.getByRole('button', { name: /La mesa/ }).click()
    await expect(page.getByText('Hay una ronda esperando que un mesero la confirme')).toBeVisible()

    // La ronda se pinta como «M-0042 · Por confirmar».
    const rondaTexto = (await page.getByText(/^M-\d{4} · /).first().textContent())?.trim() ?? ''
    const folio = rondaTexto.split(' · ')[0].trim()
    expect(folio).toMatch(/^M-\d{4}$/)
    await page.keyboard.press('Escape')

    // ── 2. El mesero entra y aterriza en su sección ─────────────────────────
    await page.goto(`${BASE}/panel/login`)
    await page.fill('#email', MESERO.email)
    await page.fill('#password', MESERO.password)
    await page.getByRole('button', { name: /Entrar/ }).click()

    // Un mesero va a su propia sección, no al tablero de gerencia.
    await page.waitForURL(`${BASE}/panel/mesero`)

    // ── 3. El pedido aparece en la cola de aprobación ───────────────────────
    const enCola = page.getByTestId('cola-pedido').filter({ hasText: folio })
    await expect(enCola).toBeVisible()
    await expect(enCola).toContainText('Mesa 2')
    await expect(enCola).toContainText('Ronda 1')
    await expect(enCola).toContainText('Prueba Mesero')

    // ── 4. Aprueba: el pedido sale de la cola y pasa a cocina ───────────────
    await enCola.getByTestId('cola-aprobar').click()

    await expect(page.getByTestId('cola-pedido').filter({ hasText: folio })).toHaveCount(0)

    // Y ya no vuelve a la lista de pendientes.
    await page.goto(`${BASE}/panel/pedidos?estado=por_confirmar`)
    await expect(page.getByText(folio)).toHaveCount(0)
  })
})
