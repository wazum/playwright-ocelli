import { readFileSync } from 'node:fs'
import { relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { fit } from './features/diff-image/fit.ts'
import { renderBlocks } from './features/diff-image/render-blocks.ts'
import { renderKitty } from './features/diff-image/render-kitty.ts'
import { analyse } from './features/diff-summary/analyse.ts'
import { format } from './features/diff-summary/format.ts'
import { reportLink } from './features/report-link.ts'
import { hyperlink, line, truncateStart } from './line.ts'
import type { Options } from './options.ts'
import { resolveMode, resolveOptions } from './options.ts'
import type { DecodedImage } from './playwright-internals.ts'
import { ListReporter, PNG } from './playwright-internals.ts'

type TestCase = { expectedStatus: string; id: string }
type Attachment = { name: string; path?: string }
type TestResult = { status: string; attachments: Attachment[] }
type Line = { emit: string; visibleWidth: number }

const DIFF_SUFFIX = '-diff.png'
const INDENT = '       '
const FALLBACK_COLUMNS = 80
const SEPARATOR = line(' · ')
const BUDGET_SPENT = 'maxImages reached · later diffs are summarised only'

export default class Ocelli extends ListReporter {
  #options: Options
  #configDir: string
  #imagesDrawn = 0
  #budgetAnnounced = false
  #snapshotFailures = 0

  constructor(options: Record<string, unknown> = {}) {
    super(options)
    this.#options = resolveOptions(options)
    this.#configDir = String(options.configDir ?? process.cwd())
  }

  override onTestEnd(test: TestCase, result: TestResult) {
    super.onTestEnd(test, result)

    for (const diffPath of qualifyingDiffs(test, result)) {
      this.#report(diffPath, test)
    }
  }

  #report(diffPath: string, test: TestCase) {
    const diff = readFileSync(diffPath)
    const image = PNG.sync.read(diff)

    this.#snapshotFailures++
    this.#writeLines([format(analyse(image))])
    this.#drawWithinBudget(this.#renderMode(), diff, image)
    this.#writeLines(this.#destinationsFor(diffPath, test))
  }

  override async onEnd(result: unknown) {
    await super.onEnd(result)

    if (this.#snapshotFailures === 0) return

    const differ =
      this.#snapshotFailures === 1 ? 'snapshot differs' : 'snapshots differ'

    this.#writeLines(
      [
        line(
          `${this.#snapshotFailures} ${differ} · accept with: npx playwright test --update-snapshots`,
        ),
      ],
      '',
    )
  }

  #drawWithinBudget(mode: string, diff: Buffer, image: DecodedImage) {
    if (mode === 'off') return

    if (this.#imagesDrawn >= this.#options.maxImages) {
      if (this.#budgetAnnounced) return

      this.#budgetAnnounced = true
      this.#writeLines([line(BUDGET_SPENT)])

      return
    }

    if (mode === 'blocks') {
      this.#writeLines(renderBlocks(image, this.#sizeFor(image)))
    }

    if (mode === 'kitty') this.#writeImage(diff, image)

    this.#imagesDrawn++
  }

  #writeImage(diff: Buffer, image: DecodedImage) {
    const { escape, rows } = renderKitty(diff, this.#sizeFor(image))

    this._maybeWriteNewLine()
    this._updateLineCountAndNewLineFlagForOutput('\n'.repeat(rows))
    this.screen.stdout.write(`${INDENT}${escape}\n`)
  }

  #destinationsFor(diffPath: string, test: TestCase): Line[] {
    const shown = truncateStart(
      relative(process.cwd(), diffPath),
      this.#budgetColumns(),
    )
    const report = reportLink(this.#configDir, this.config.reporter, test.id)

    // A stripped BEL hyperlink collapses to its display text, and the report
    // link's display text is the word "report" - the URL would be gone.
    if (!this.#hasColours()) {
      const plain = [shown]

      if (report !== null) plain.push(line(report))

      return plain
    }

    const destinations = [hyperlink(shown.emit, pathToFileURL(diffPath).href)]

    if (report !== null) destinations.push(hyperlink('report', report))

    return [joined(destinations, SEPARATOR)]
  }

  #hasColours() {
    return this.screen.colors.red('x') !== 'x'
  }

  #renderMode() {
    return resolveMode(this.#options.mode, {
      isTTY: Boolean(this.screen.isTTY),
      hasColours: this.#hasColours(),
      isCI: Boolean(process.env.CI),
    })
  }

  #sizeFor(image: { width: number; height: number }) {
    return fit({
      imageWidth: image.width,
      imageHeight: image.height,
      maxColumns: this.#budgetColumns(),
      maxRows: this.#options.maxRows,
      cellAspect: this.#options.cellAspect,
    })
  }

  #budgetColumns() {
    const width = this.screen.ttyWidth || FALLBACK_COLUMNS

    return width - INDENT.length
  }

  #writeLines(lines: Line[], prefix = INDENT) {
    const indented = lines.map((line) => withPrefix(line, prefix))

    this._maybeWriteNewLine()
    this._updateLineCountAndNewLineFlagForOutput(accountingFor(indented))

    for (const line of indented) {
      this.screen.stdout.write(`${line.emit}\n`)
    }
  }
}

export function qualifyingDiffs(
  test: Pick<TestCase, 'expectedStatus'>,
  result: TestResult,
): string[] {
  if (result.status === 'skipped') return []
  if (result.status === test.expectedStatus) return []

  return result.attachments.flatMap((attachment) =>
    attachment.name.endsWith(DIFF_SUFFIX) && attachment.path
      ? [attachment.path]
      : [],
  )
}

function withPrefix(line: Line, prefix: string): Line {
  return {
    emit: prefix + line.emit,
    visibleWidth: prefix.length + line.visibleWidth,
  }
}

function joined(parts: Line[], separator: Line): Line {
  const gaps = parts.length - 1

  return {
    emit: parts.map((part) => part.emit).join(separator.emit),
    visibleWidth:
      parts.reduce((total, part) => total + part.visibleWidth, 0) +
      separator.visibleWidth * gaps,
  }
}

function accountingFor(lines: Line[]) {
  return lines.map((line) => `${' '.repeat(line.visibleWidth)}\n`).join('')
}
