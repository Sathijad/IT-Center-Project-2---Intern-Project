import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import allureReporter from 'allure-vitest/reporter'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts', 'allure-vitest/setup'],
    globals: true,
    // Exclude Mocha UI tests (they use a different test runner)
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/tests/ui/**', // Mocha tests, not Vitest
    ],
    // Allure reporter configuration
    reporters: ['default', allureReporter],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

