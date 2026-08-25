import { createRequire } from 'node:module'

export function resolveInternals(fromUrl: string) {
  const fromOcelli = createRequire(fromUrl)

  try {
    const fromPlaywrightTest = createRequire(
      fromOcelli.resolve('@playwright/test'),
    )
    const fromPlaywright = createRequire(
      fromPlaywrightTest.resolve('playwright'),
    )

    return fromPlaywright('playwright-core/lib/utilsBundle')
  } catch (cause) {
    throw new Error(
      `ocelli could not reach Playwright's internal modules (@playwright/test ${installedVersion(fromOcelli)}). ocelli resolves them through @playwright/test, which must be installed alongside it.`,
      { cause },
    )
  }
}

export const { PNG, getEastAsianWidth } = resolveInternals(import.meta.url)

function installedVersion(fromOcelli: NodeJS.Require) {
  try {
    return fromOcelli('@playwright/test/package.json').version
  } catch {
    return 'not installed'
  }
}
