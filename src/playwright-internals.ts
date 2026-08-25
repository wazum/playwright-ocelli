import { createRequire } from 'node:module'

const fromOcelli = createRequire(import.meta.url)
const fromPlaywrightTest = createRequire(fromOcelli.resolve('@playwright/test'))
const fromPlaywright = createRequire(fromPlaywrightTest.resolve('playwright'))

export const { PNG, getEastAsianWidth } = fromPlaywright(
  'playwright-core/lib/utilsBundle',
)
