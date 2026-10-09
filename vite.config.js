import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Operator Watch UI tests (src/operator-watch); the API's tests run with jest (npm run ow:test).
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/operator-watch/test/setup.ts'],
    css: false,
  },
})
