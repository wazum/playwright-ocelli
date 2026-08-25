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
import { ListReporter, PNG } from './playwright-internals.ts'

type TestCase = { expectedStatus: string; id: string }
type Attachment = { name: string; path?: string }
type TestResult = { status: string; attachments: Attachment[] }
type Line = { emit: string; visibleWidth: number }

const DIFF_SUFFIX = '-diff.png'
const INDENT = '       '
const FALLBACK_COLUMNS = 80
const SEPARATOR = line(' · ')

export default class Ocelli extends ListReporter {
  #options: Options
  #configDir: string

  constructor(options: Record<string, unknown> = {}) {
    super(options)
    this.#options = resolveOptions(options)
    this.#configDir = String(options.configDir ?? process.cwd())
  }

  onTestEnd(test: TestCase, result: TestResult) {
    super.onTestEnd(test, result)

    const diffPath = qualifyingDiff(test, result)

    if (diffPath === null) return

    const diff = readFileSync(diffPath)
    const mode = this.#renderMode()

    this.#writeLines([format(analyse(diff))])

    if (mode === 'blocks') this.#writeLines(this.#blocksFor(diff))
    if (mode === 'kitty') this.#writeImage(diff)

    this.#writeLines([this.#destinationsFor(diffPath, test)])
  }

  #writeImage(diff: Buffer) {
    const image = PNG.sync.read(diff)
    const { escape, rows } = renderKitty(diff, this.#sizeFor(image))

    this._maybeWriteNewLine()
    this._updateLineCountAndNewLineFlagForOutput('\n'.repeat(rows))
    this.screen.stdout.write(`${INDENT}${escape}\n`)
  }

  #destinationsFor(diffPath: string, test: TestCase) {
    const shown = truncateStart(
      relative(process.cwd(), diffPath),
      this.#budgetColumns(),
    )
    const destinations = [
      hyperlink(shown.emit, pathToFileURL(diffPath).href),
    ]
    const report = reportLink(this.#configDir, this.config.reporter, test.id)

    if (report !== null) {
      destinations.push(hyperlink('report', report))
    }

    return joined(destinations, SEPARATOR)
  }

  #renderMode() {
    return resolveMode(this.#options.mode, {
      isTTY: Boolean(this.screen.isTTY),
      hasColours: this.screen.colors.red('x') !== 'x',
      isCI: Boolean(process.env.CI),
    })
  }

  #blocksFor(diff: Buffer) {
    const image = PNG.sync.read(diff)

    return renderBlocks(image, this.#sizeFor(image))
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

  #writeLines(lines: Line[]) {
    const indented = lines.map(indent)

    this._maybeWriteNewLine()
    this._updateLineCountAndNewLineFlagForOutput(accountingFor(indented))

    for (const line of indented) {
      this.screen.stdout.write(`${line.emit}\n`)
    }
  }
}

export function qualifyingDiff(test: TestCase, result: TestResult) {
  if (result.status === 'skipped') return null
  if (result.status === test.expectedStatus) return null

  const diff = result.attachments.find(
    (attachment) => attachment.name.endsWith(DIFF_SUFFIX) && attachment.path,
  )

  return diff?.path ?? null
}

function indent(line: Line): Line {
  return {
    emit: INDENT + line.emit,
    visibleWidth: INDENT.length + line.visibleWidth,
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
