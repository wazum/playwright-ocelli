import { readFileSync } from 'node:fs'
import { fit } from './features/diff-image/fit.ts'
import { renderBlocks } from './features/diff-image/render-blocks.ts'
import { analyse } from './features/diff-summary/analyse.ts'
import { format } from './features/diff-summary/format.ts'
import type { Options } from './options.ts'
import { resolveMode, resolveOptions } from './options.ts'
import { ListReporter, PNG } from './playwright-internals.ts'

type TestCase = { expectedStatus: string }
type Attachment = { name: string; path?: string }
type TestResult = { status: string; attachments: Attachment[] }
type Line = { emit: string; visibleWidth: number }

const DIFF_SUFFIX = '-diff.png'
const INDENT = '       '
const FALLBACK_COLUMNS = 80

export default class Ocelli extends ListReporter {
  #options: Options

  constructor(options: Record<string, unknown> = {}) {
    super(options)
    this.#options = resolveOptions(options)
  }

  onTestEnd(test: TestCase, result: TestResult) {
    super.onTestEnd(test, result)

    const diffPath = qualifyingDiff(test, result)

    if (diffPath === null) return

    const diff = readFileSync(diffPath)
    const lines = [format(analyse(diff))]

    if (this.#renderMode() === 'blocks') {
      lines.push(...this.#blocksFor(diff))
    }

    this.#writeLines(lines)
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

    return renderBlocks(
      image,
      fit({
        imageWidth: image.width,
        imageHeight: image.height,
        maxColumns: this.#budgetColumns(),
        maxRows: this.#options.maxRows,
        cellAspect: this.#options.cellAspect,
      }),
    )
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

function accountingFor(lines: Line[]) {
  return lines.map((line) => `${' '.repeat(line.visibleWidth)}\n`).join('')
}
