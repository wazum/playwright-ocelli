import { createRequire } from 'node:module'

export type DecodedImage = { width: number; height: number; data: Buffer }

export type ReporterDescription = [string, Record<string, unknown>?]

export type Attachment = { name: string; path?: string }

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
  ListReporter: {
    new (options?: Record<string, unknown>): ListReporterSurface
    prototype: ListReporterSurface
  }
}

// Every inherited method ocelli calls through to. A move here used to surface
// only mid-run, on the first failing test.
const CALLED_THROUGH: (keyof ListReporterSurface)[] = [
  'onConfigure',
  'onBegin',
  'onTestBegin',
  'onTestEnd',
  'onEnd',
]

const REQUIRED_SHAPE: [string, (found: Partial<Internals>) => boolean][] = [
  ...CALLED_THROUGH.map(
    (name): [string, (found: Partial<Internals>) => boolean] => [
      `ListReporter no longer has ${name}, which ocelli calls through to`,
      (found) => typeof found.ListReporter?.prototype?.[name] === 'function',
    ],
  ),
  [
    'playwright/lib/runner no longer exports a ListReporter class',
    (found) => typeof found.ListReporter === 'function',
  ],
  [
    'ListReporter no longer has _maybeWriteNewLine and _updateLineCountAndNewLineFlagForOutput, which ocelli calls to keep the terminal line count right',
    (found) =>
      typeof found.ListReporter?.prototype?._maybeWriteNewLine === 'function' &&
      typeof found.ListReporter?.prototype
        ?._updateLineCountAndNewLineFlagForOutput === 'function',
  ],
  [
    'playwright-core/lib/utilsBundle no longer exports PNG, which ocelli uses to decode diff images',
    (found) => typeof found.PNG?.sync?.read === 'function',
  ],
  [
    'playwright-core/lib/utilsBundle no longer exports getEastAsianWidth, which ocelli uses to measure how wide a line prints',
    (found) => typeof found.getEastAsianWidth?.eastAsianWidth === 'function',
  ],
]

export function resolveInternals(fromUrl: string): Internals {
  const fromOcelli = createRequire(fromUrl)
  const version = installedVersion(fromOcelli)
  let found: Partial<Internals>

  try {
    const fromPlaywrightTest = createRequire(
      fromOcelli.resolve('@playwright/test'),
    )
    const fromPlaywright = createRequire(
      fromPlaywrightTest.resolve('playwright'),
    )

    found = {
      ...fromPlaywright('playwright-core/lib/utilsBundle'),
      ListReporter: fromPlaywrightTest('playwright/lib/runner').ListReporter,
    }
  } catch (cause) {
    throw new Error(
      `ocelli could not reach Playwright's internal modules (@playwright/test ${version}). ocelli resolves them through @playwright/test, which must be installed alongside it.`,
      { cause },
    )
  }

  return verifyInternals(found, version)
}

export function verifyInternals(found: unknown, version: string): Internals {
  const candidate = found as Partial<Internals>
  const changed = REQUIRED_SHAPE.filter(([, holds]) => !holds(candidate)).map(
    ([what]) => what,
  )

  if (changed.length === 0) return candidate as Internals

  throw new Error(
    `ocelli cannot work with @playwright/test ${version}. ocelli reads Playwright's private modules, and this version has moved what it reads:\n  - ${changed.join('\n  - ')}\nUpgrade ocelli, or hold @playwright/test at the version you were on.`,
  )
}

// The screen is instance state, built by Playwright's constructor, so the
// module check above cannot see it.
export function verifyScreen(screen: unknown) {
  const candidate = screen as Partial<TerminalScreen>

  if (
    typeof candidate?.stdout?.write === 'function' &&
    typeof candidate?.colors?.red === 'function'
  ) {
    return
  }

  throw new Error(
    `ocelli cannot work with @playwright/test ${playwrightVersion}. The reporter's screen no longer offers stdout.write and colors.red, which ocelli writes and colours through. Upgrade ocelli, or hold @playwright/test at the version you were on.`,
  )
}

export const playwrightVersion: string = installedVersion(
  createRequire(import.meta.url),
)

export const { PNG, getEastAsianWidth, ListReporter } =
  resolveInternals(import.meta.url)

function installedVersion(fromOcelli: NodeJS.Require) {
  try {
    return fromOcelli('@playwright/test/package.json').version
  } catch {
    return 'not installed'
  }
}
