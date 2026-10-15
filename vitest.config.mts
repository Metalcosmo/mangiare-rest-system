import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/int/**/*.int.spec.ts'],
    // Cada archivo levanta su propia instancia de Payload contra la misma base
    // local de D1; en paralelo chocan dentro de miniflare. En serie es estable.
    fileParallelism: false,
  },
})
