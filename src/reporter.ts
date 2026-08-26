import { readFileSync } from 'node:fs'
import { basename, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { fit } from './features/diff-image/fit.ts'
import { renderBlocks } from './features/diff-image/render-blocks.ts'
import { renderKitty } from './features/diff-image/render-kitty.ts'
import { analyse } from './features/diff-summary/analyse.ts'
import { format } from './features/diff-summary/format.ts'
import { frameSizes } from './features/diff-summary/frame-size.ts'
import { reportLink } from './features/report-link.ts'
import { hyperlink, line, truncateStart } from './line.ts'
import type { Options } from './options.ts'
import { resolveMode, resolveOptions } from './options.ts'
import type { DecodedImage } from './playwright-internals.ts'
import { ListReporter, PNG, verifyScreen } from './playwright-internals.ts'
import type { TestResult } from './qualifying-diffs.ts'
import { qualifyingDiffs } from './qualifying-diffs.ts'

type TestCase = { expectedStatus: string; id: string }
type Attachment = { name: string; path?: string }
type Line = { emit: string; visibleWidth: number }
type Sizes = NonNullable<ReturnType<typeof frameSizes>>

const INDENT = '       '
const FALLBACK_COLUMNS = 80
const SEPARATOR = line(' · ')
const BUDGET_SPENT = 'maxImages reached · later diffs are summarised only'

export default class Ocelli extends ListReporter {
  #options: Options
  #configDir: string
  #imagesDrawn = 0
  #budgetAnnounced = false
  #snapshotsSeen = new Set<string>()

  constructor(options: Record<string, unknown> = {}) {
    super(options)
    verifyScreen(this.screen)
    this.#options = resolveOptions(options)
    this.#configDir = String(options.configDir ?? process.cwd())
  }

  override onTestEnd(test: TestCase, result: TestResult) {
    super.onTestEnd(test, result)

    for (const diffPath of qualifyingDiffs(test, result)) {
      this.#report(diffPath, test, result.attachments)
    }
  }

  #report(diffPath: string, test: TestCase, attachments: Attachment[]) {
    let diff: Buffer
    let image: DecodedImage

    // Playwright counts a throwing reporter as a failed run, so a diff that
    // vanished or landed half-written must not escape this method.
    try {
      diff = readFileSync(diffPath)
      image = PNG.sync.read(diff)
    } catch {
      this.#writeLines([line('diff could not be read')])
      this.#writeLines(this.#destinationsFor(diffPath, test))

      return
    }

    // A retry writes the same snapshot to a -retryN directory, so the path
    // differs while the snapshot does not.
    this.#snapshotsSeen.add(`${test.id}::${basename(diffPath)}`)

    const summary = analyse(image)
    const sizes =
      summary.boundingBox === null
        ? frameSizes(attachments, basename(diffPath))
        : null

    this.#writeLines([sizes === null ? format(summary) : describeSizes(sizes)])

    // Nothing red or yellow means there is nothing an image could show. A
    // size mismatch produces exactly that: the expected frame, faded to grey.
    if (summary.boundingBox !== null) {
      this.#drawWithinBudget(this.#renderMode(), diff, image)
    }

    this.#writeLines(this.#destinationsFor(diffPath, test))
  }

  override async onEnd(result: unknown) {
    await super.onEnd(result)

    const differing = this.#snapshotsSeen.size

    if (differing === 0) return

    const differ = differing === 1 ? 'snapshot differs' : 'snapshots differ'

    this.#writeLines(
      [
        line(
          `${differing} ${differ} · accept with: npx playwright test --update-snapshots`,
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

function describeSizes({ expected, actual }: Sizes): Line {
  return line(
    `size differs · expected ${expected.width}×${expected.height}, got ${actual.width}×${actual.height}`,
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
