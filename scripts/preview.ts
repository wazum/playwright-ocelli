import { readFileSync } from 'node:fs'
import { relative } from 'node:path'
import { cropFor, cropped } from '../src/features/diff-image/crop.ts'
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

const budget = (frame: { width: number; height: number }) =>
  fit({
    imageWidth: frame.width,
    imageHeight: frame.height,
    maxColumns: MAX_COLUMNS,
    maxRows: MAX_ROWS,
    cellAspect: CELL_ASPECT,
  })

const analysed = analyse(image)
const summary = format(analysed)
const region =
  analysed.boundingBox === null
    ? null
    : cropFor(analysed.boundingBox, image, budget(image))
const size = budget(region ?? image)
const link = reportLink(process.cwd(), [['html']], 'preview-test-id')
const shownPath = truncateStart(relative(process.cwd(), path), MAX_COLUMNS)

console.log(`${INDENT}${summary.emit}`)

if (useKitty) {
  const sent = region === null ? diff : cropped(image, region)

  process.stdout.write(`${INDENT}${renderKitty(sent, size).escape}\n`)
} else {
  for (const row of renderBlocks(image, size, region ?? undefined)) {
    console.log(`${INDENT}${row.emit}`)
  }
}

console.log(
  `${INDENT}${shownPath.emit}${link === null ? '' : ` · ${hyperlink('report', link).emit}`}`,
)
const cropNote =
  region === null
    ? ''
    : ` · cropped to ${region.width}×${region.height} at ${region.x},${region.y}`

console.log(
  `${INDENT}${image.width}×${image.height} px shown as ${size.columns}×${size.rows} cells${cropNote}`,
)
