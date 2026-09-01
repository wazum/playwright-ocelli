import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  reporter: [['../../src/reporter.ts', { mode: 'blocks' }], ['html', { open: 'never' }]],
  use: {
    viewport: {
      width: 480,
      height: Number(process.env.DEMO_VIEWPORT_HEIGHT ?? 240),
    },
  },
})
