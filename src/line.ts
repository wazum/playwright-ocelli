import { getEastAsianWidth } from './playwright-internals.ts'

const graphemes = new Intl.Segmenter()
const NON_PRINTABLE = /[\p{Cc}\p{Cf}]/gu
const OSC8 = '\x1b]8;;'
const BEL = '\x07'
const ELLIPSIS = '…'

export function line(displayText: string) {
  const emit = displayText.replace(NON_PRINTABLE, '')

  return { emit, visibleWidth: measureWidth(emit) }
}

export function hyperlink(displayText: string, target: string) {
  const { emit, visibleWidth } = line(displayText)

  return { emit: `${OSC8}${target}${BEL}${emit}${OSC8}${BEL}`, visibleWidth }
}

export function truncateStart(displayText: string, maxCells: number) {
  const { emit, visibleWidth } = line(displayText)

  if (visibleWidth <= maxCells) return emit

  const budgetForTail = maxCells - widthOf(ELLIPSIS)
  const tail = []
  let cells = 0

  for (const { segment } of [...graphemes.segment(emit)].reverse()) {
    if (cells + widthOf(segment) > budgetForTail) break

    tail.unshift(segment)
    cells += widthOf(segment)
  }

  return ELLIPSIS + tail.join('')
}

function measureWidth(text: string) {
  let cells = 0

  for (const { segment } of graphemes.segment(text)) {
    cells += widthOf(segment)
  }

  return cells
}

function widthOf(grapheme: string) {
  return getEastAsianWidth.eastAsianWidth(grapheme.codePointAt(0)!)
}
