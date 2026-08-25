import { getEastAsianWidth } from './playwright-internals.ts'

const graphemes = new Intl.Segmenter()

// Controls, plus the format characters that reorder or hide text. Deliberately
// not all of \p{Cf}: that class also holds the joiners emoji are built from,
// and stripping those rewrites a joined family into four separate people.
const NON_PRINTABLE = new RegExp(
  '[\\p{Cc}\\u200b\\u200e\\u200f\\u202a-\\u202e\\u2066-\\u2069\\ufeff]',
  'gu',
)

// A terminal gives an emoji two cells, and draws a flag's two regional
// indicators as one glyph. East Asian width alone calls both of them narrow.
const TWO_CELLS = new RegExp(
  '\\p{Emoji_Presentation}|\\ufe0f|[\\u{1f1e6}-\\u{1f1ff}]',
  'u',
)

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
  const measured = line(displayText)
  const { emit, visibleWidth } = measured

  if (visibleWidth <= maxCells) return measured

  const budgetForTail = maxCells - widthOf(ELLIPSIS)
  const tail = []
  let cells = 0

  for (const { segment } of [...graphemes.segment(emit)].reverse()) {
    if (cells + widthOf(segment) > budgetForTail) break

    tail.unshift(segment)
    cells += widthOf(segment)
  }

  return line(ELLIPSIS + tail.join(''))
}

function measureWidth(text: string) {
  let cells = 0

  for (const { segment } of graphemes.segment(text)) {
    cells += widthOf(segment)
  }

  return cells
}

function widthOf(grapheme: string) {
  if (TWO_CELLS.test(grapheme)) return 2

  return getEastAsianWidth.eastAsianWidth(grapheme.codePointAt(0)!)
}
