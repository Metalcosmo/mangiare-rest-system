import { expect, test, type Page } from '@playwright/test'

import { login } from '../helpers/login'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

test.describe('Admin de Payload', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    await seedTestUser()

    const context = await browser.newContext()
    page = await context.newPage()

    await login({ page, user: testUser })
  })

  test.afterAll(async () => {
    await cleanupTestUser()
  })

  test('puede abrir el tablero', async () => {
    await page.goto('http://localhost:3000/admin')
    await expect(page).toHaveURL('http://localhost:3000/admin')
    const tablero = page.locator('span[title="Panel de Control"]').first()
    await expect(tablero).toBeVisible()
  })

  test('puede abrir el listado de personal', async () => {
    await page.goto('http://localhost:3000/admin/collections/users')
    await expect(page).toHaveURL('http://localhost:3000/admin/collections/users')
    const listado = page.locator('h1', { hasText: 'Empleados y accesos' }).first()
    await expect(listado).toBeVisible()
  })

  test('puede abrir el formulario de alta', async () => {
    await page.goto('http://localhost:3000/admin/collections/users/create')
    await expect(page).toHaveURL(/\/admin\/collections\/users\/[a-zA-Z0-9-_]+/)
    const campoCorreo = page.locator('input[name="email"]')
    await expect(campoCorreo).toBeVisible()
  })
})
