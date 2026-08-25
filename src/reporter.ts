import { readFileSync } from 'node:fs'
import { analyse } from './features/diff-summary/analyse.ts'
import { format } from './features/diff-summary/format.ts'
import { ListReporter } from './playwright-internals.ts'

type TestCase = { expectedStatus: string }
type Attachment = { name: string; path?: string }
type TestResult = { status: string; attachments: Attachment[] }
type Line = { emit: string; visibleWidth: number }

const DIFF_SUFFIX = '-diff.png'
const INDENT = '       '

export default class Ocelli extends ListReporter {
  onTestEnd(test: TestCase, result: TestResult) {
    super.onTestEnd(test, result)

    const diffPath = qualifyingDiff(test, result)

    if (diffPath === null) return

    this.#writeLines([format(analyse(readFileSync(diffPath)))])
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
