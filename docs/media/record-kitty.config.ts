import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './examples/demo',
  reporter: [
    ['./src/reporter.ts', { mode: 'kitty', maxRows: 8 }],
    ['html', { open: 'never' }],
  ],
  use: { viewport: { width: 480, height: 240 } },
})
