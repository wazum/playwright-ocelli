import { readFileSync } from 'node:fs'
import { relative } from 'node:path'
import { fit } from '../src/features/diff-image/fit.ts'
import { renderBlocks } from '../src/features/diff-image/render-blocks.ts'
import { renderKitty } from '../src/features/diff-image/render-kitty.ts'
import { analyse } from '../src/features/diff-summary/analyse.ts'
import { format } from '../src/features/diff-summary/format.ts'
import { reportLink } from '../src/features/report-link.ts'
import { hyperlink, truncateStart } from '../src/line.ts'
import { PNG } from '../src/playwright-internals.ts'

const INDENT = '       '
const MAX_COLUMNS = 72
const MAX_ROWS = 16
const CELL_ASPECT = 2.1

const useKitty = process.argv.includes('--kitty')
const path =
  process.argv.slice(2).find((argument) => !argument.startsWith('--')) ??
  'test/fixtures/one-digit-diff.png'
const diff = readFileSync(path)
const image = PNG.sync.read(diff)

const summary = format(analyse(diff))
const size = fit({
  imageWidth: image.width,
  imageHeight: image.height,
  maxColumns: MAX_COLUMNS,
  maxRows: MAX_ROWS,
  cellAspect: CELL_ASPECT,
})
const link = reportLink(process.cwd(), [['html']], 'preview-test-id')
const shownPath = truncateStart(relative(process.cwd(), path), MAX_COLUMNS)

console.log(`${INDENT}${summary.emit}`)

if (useKitty) {
  process.stdout.write(`${INDENT}${renderKitty(diff, size).escape}\n`)
} else {
  for (const row of renderBlocks(image, size)) {
    console.log(`${INDENT}${row.emit}`)
  }
}

console.log(
  `${INDENT}${shownPath.emit}${link === null ? '' : ` · ${hyperlink('report', link).emit}`}`,
)
console.log(
  `${INDENT}${image.width}×${image.height} px shown as ${size.columns}×${size.rows} cells`,
)
