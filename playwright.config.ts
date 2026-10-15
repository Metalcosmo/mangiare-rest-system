import { defineConfig, devices } from '@playwright/test'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import 'dotenv/config'

/**
 * Suite ligera: carta pública y flujo del cliente.
 *
 * Está pensada para equipos con poca memoria (8 GB). Por eso:
 * - un solo worker y sin paralelismo (un navegador a la vez),
 * - el navegador arranca con un límite de heap reducido,
 * - no se guardan trazas ni video,
 * - el admin de Payload (que compila un bundle enorme) queda fuera y vive en
 *   `playwright.admin.config.ts`.
 *
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Un solo worker: nunca hay dos navegadores vivos a la vez. */
  workers: 1,
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Sin reintentos: cada reintento vuelve a compilar y levanta otro navegador. */
  retries: 0,
  /* Reporter ligero: el HTML mantiene en memoria toda la corrida. */
  reporter: 'list',
  use: {
    /* En desarrollo Next.js compila cada ruta la primera vez que se visita. */
    navigationTimeout: 120_000,
    actionTimeout: 30_000,

    trace: 'off',
    video: 'off',
    screenshot: 'only-on-failure',

    launchOptions: {
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-background-networking',
        '--js-flags=--max-old-space-size=256',
      ],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    reuseExistingServer: true,
    url: 'http://localhost:3000',
  },
})
