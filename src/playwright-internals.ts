import { createRequire } from 'node:module'

export type DecodedImage = { width: number; height: number; data: Buffer }

export type ReporterDescription = [string, Record<string, unknown>?]

export type TerminalScreen = {
  isTTY: boolean
  ttyWidth: number
  ttyHeight: number
  colors: { red(text: string): string }
  stdout: { write(chunk: string): boolean }
}

// The private surface ocelli depends on. Narrower than what Playwright
// actually exposes, on purpose: this is the checklist the canary run is
// really testing, so it should list only what breaking would break us.
export type ListReporterSurface = {
  config: { reporter: ReporterDescription[] }
  screen: TerminalScreen
  onConfigure(config: unknown): void
  onBegin(suite: unknown): void
  onTestBegin(test: unknown, result: unknown): void
  onTestEnd(test: unknown, result: unknown): void
  onEnd(result: unknown): Promise<unknown>
  _maybeWriteNewLine(): void
  _updateLineCountAndNewLineFlagForOutput(text: string): void
}

type Internals = {
  PNG: {
    sync: {
      read(buffer: Buffer): DecodedImage
      write(image: DecodedImage): Buffer
    }
  }
  getEastAsianWidth: { eastAsianWidth(codePoint: number): number }
  ListReporter: new (options?: Record<string, unknown>) => ListReporterSurface
}

export function resolveInternals(fromUrl: string): Internals {
  const fromOcelli = createRequire(fromUrl)

  try {
    const fromPlaywrightTest = createRequire(
      fromOcelli.resolve('@playwright/test'),
    )
    const fromPlaywright = createRequire(
      fromPlaywrightTest.resolve('playwright'),
    )

    return {
      ...fromPlaywright('playwright-core/lib/utilsBundle'),
      ListReporter: fromPlaywrightTest('playwright/lib/runner').ListReporter,
    }
  } catch (cause) {
    throw new Error(
      `ocelli could not reach Playwright's internal modules (@playwright/test ${installedVersion(fromOcelli)}). ocelli resolves them through @playwright/test, which must be installed alongside it.`,
      { cause },
    )
  }
}

export const { PNG, getEastAsianWidth, ListReporter } =
  resolveInternals(import.meta.url)

function installedVersion(fromOcelli: NodeJS.Require) {
  try {
    return fromOcelli('@playwright/test/package.json').version
  } catch {
    return 'not installed'
  }
}
