import { defineConfig, devices } from '@playwright/test'

import 'dotenv/config'

/**
 * Suite del admin técnico de Payload.
 *
 * Va aparte porque la primera visita a `/admin` obliga a Next.js a compilar el
 * bundle completo de la interfaz de Payload, que es muy pesado. En equipos con
 * poca memoria conviene ejecutarla sola, con el servidor de desarrollo recién
 * arrancado:
 *
 *   pnpm test:e2e:admin
 */
export default defineConfig({
  testDir: './tests/e2e-admin',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    /* Payload compila todo su panel en la primera visita. */
    navigationTimeout: 180_000,
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
