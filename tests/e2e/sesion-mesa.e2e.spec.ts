import { expect, test } from '@playwright/test'

import { BASE, abrirMesa, prepararMesa } from '../helpers/mesa'

/**
 * Pedido compartido de una mesa.
 *
 * Dos comensales en teléfonos distintos: el anfitrión abre la mesa con su
 * cédula, el otro entra escribiéndola. Los dos agregan y quitan platillos del
 * mismo pedido, pero **sólo el anfitrión puede mandarlo al mesero**.
 *
 * Es una sola prueba larga a propósito: en un equipo de 8 GB cada contexto de
 * navegador cuesta, y el recorrido necesita los dos teléfonos a la vez.
 */
const ANFITRION = { nombre: 'Ana Prueba', cedula: 'V90000009' }
const INVITADO = { cedula: 'V90000009' }

const MESERO = { email: 'mesero@mangiare.mx', password: 'mangiare123' }

test.describe('Pedido compartido de la mesa', () => {
  // Dos teléfonos y un login del mesero: no cabe en los 30 s por defecto.
  test.setTimeout(180_000)

  test('sólo el anfitrión manda el pedido, y el mesero lo confirma', async ({
    browser,
    request,
  }) => {
    const telefonoA = await browser.newContext()
    const telefonoB = await browser.newContext()

    try {
      const anfitrion = await telefonoA.newPage()
      const invitado = await telefonoB.newPage()

      // ── 1. El anfitrión abre la mesa y agrega un platillo ────────────────
      await prepararMesa(request, 'mesa-8')
      await abrirMesa(anfitrion, 'mesa-8', ANFITRION)

      await anfitrion
        .locator('article')
        .filter({ hasText: 'Ensalada César' })
        .getByRole('button', { name: 'Agregar', exact: true })
        .click()

      await expect(
        anfitrion.locator('[data-slot="sheet-content"]').getByText('Ensalada César'),
      ).toBeVisible()

      // ── 2. El otro teléfono necesita la cédula del anfitrión ─────────────
      await invitado.goto(`${BASE}/mesa/mesa-8`)

      await expect(invitado.getByText('Esta mesa ya está abierta')).toBeVisible()
      // La puerta no revela el nombre del anfitrión.
      await expect(invitado.getByText(ANFITRION.nombre)).toHaveCount(0)

      await invitado.getByLabel('Cédula del anfitrión').fill('V00000000')
      await invitado.getByRole('button', { name: 'Unirme a la mesa' }).click()
      await expect(invitado.getByText('La cédula no coincide con quien abrió la mesa.')).toBeVisible()

      await invitado.getByLabel('Cédula del anfitrión').fill(INVITADO.cedula)
      await invitado.getByRole('button', { name: 'Unirme a la mesa' }).click()

      await expect(invitado.getByPlaceholder('Buscar en la carta…')).toBeVisible()
      await expect(invitado.getByText('Invitado')).toBeVisible()

      // ── 3. Ve el pedido de la mesa y agrega lo suyo ──────────────────────
      await invitado.getByRole('button', { name: /La mesa/ }).click()

      const hojaInvitado = invitado.locator('[data-slot="sheet-content"]')
      await expect(hojaInvitado.getByText('Ensalada César')).toBeVisible()

      await invitado.keyboard.press('Escape')
      await invitado
        .locator('article')
        .filter({ hasText: 'Bruschetta della casa' })
        .getByRole('button', { name: 'Agregar', exact: true })
        .click()

      await invitado.getByRole('button', { name: /La mesa/ }).click()
      await expect(hojaInvitado.getByText('Bruschetta della casa')).toBeVisible()

      // Un invitado no puede mandar el pedido.
      await expect(
        hojaInvitado.getByRole('button', { name: /Enviar pedido al mesero/ }),
      ).toHaveCount(0)
      await expect(
        hojaInvitado.getByText('Sólo quien abrió la mesa puede mandar el pedido al mesero.'),
      ).toBeVisible()

      await invitado.keyboard.press('Escape')

      // ── 4. El anfitrión ve lo que agregó el invitado y lo manda ──────────
      await anfitrion.reload()
      await anfitrion.getByRole('button', { name: /La mesa/ }).click()

      const hojaAnfitrion = anfitrion.locator('[data-slot="sheet-content"]')
      await expect(hojaAnfitrion.getByText('Bruschetta della casa')).toBeVisible()

      await hojaAnfitrion.getByRole('button', { name: /Enviar pedido al mesero/ }).click()

      await expect(
        anfitrion.locator('[data-sonner-toast]').filter({ hasText: /Un mesero lo confirmará/ }).first(),
      ).toBeVisible()

      // El panel se cierra al enviar: se vuelve a abrir para ver la ronda.
      await anfitrion.getByRole('button', { name: /La mesa/ }).click()

      await expect(
        anfitrion.getByText('Hay una ronda esperando que un mesero la confirme'),
      ).toBeVisible()

      // La ronda se pinta como «M-0042 · Por confirmar».
      const rondaTexto =
        (await anfitrion.getByText(/^M-\d{4} · /).first().textContent())?.trim() ?? ''
      const folio = rondaTexto.split(' · ')[0].trim()
      expect(folio).toMatch(/^M-\d{4}$/)

      // ── 5. El mesero lo revisa y lo aprueba ──────────────────────────────
      const panel = await telefonoA.newPage()
      await panel.goto(`${BASE}/panel/login`)
      await panel.fill('#email', MESERO.email)
      await panel.fill('#password', MESERO.password)
      await panel.getByRole('button', { name: /Entrar/ }).click()
      await panel.waitForURL(`${BASE}/panel/mesero`)

      const enCola = panel.getByTestId('cola-pedido').filter({ hasText: folio })
      await expect(enCola).toBeVisible()
      await expect(enCola).toContainText('Mesa 8')
      await expect(enCola).toContainText('Ana Prueba')
      await expect(enCola).toContainText('Ronda')
      await expect(enCola).toContainText('Bruschetta della casa')

      await enCola.getByTestId('cola-aprobar').click()
      await expect(panel.getByTestId('cola-pedido').filter({ hasText: folio })).toHaveCount(0)

      // ── 6. La mesa ve su ronda ya en cocina ──────────────────────────────
      await anfitrion.reload()
      await anfitrion.getByRole('button', { name: /La mesa/ }).click()

      await expect(anfitrion.locator('[data-slot="sheet-content"]').getByText(folio)).toBeVisible()
      await expect(
        anfitrion.getByText('Hay una ronda esperando que un mesero la confirme'),
      ).toHaveCount(0)
    } finally {
      await telefonoA.close()
      await telefonoB.close()
    }
  })
})
