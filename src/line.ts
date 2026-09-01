import { getEastAsianWidth } from './playwright-internals.ts'

export type Line = { emit: string; visibleWidth: number }

const graphemes = new Intl.Segmenter()

// Controls, plus the format characters that reorder or hide text. Deliberately
// not all of \p{Cf}: that class also holds the joiners and tags emoji are built
// from, and stripping those rewrites a joined family into four separate people
// and flattens a subdivision flag.
const NON_PRINTABLE = new RegExp(
  '[\\p{Cc}\\u00ad\\u061c\\u180e\\u200b\\u200e\\u200f\\u202a-\\u202e' +
    '\\u2060-\\u2064\\u2066-\\u206f\\ufeff\\ufff9-\\ufffb]',
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

export function line(displayText: string): Line {
  const emit = displayText.replace(NON_PRINTABLE, '')

  return { emit, visibleWidth: measureWidth(emit) }
}

export function hyperlink(displayText: string, target: string): Line {
  const { emit, visibleWidth } = line(displayText)

  return { emit: `${OSC8}${target}${BEL}${emit}${OSC8}${BEL}`, visibleWidth }
}

export function truncateStart(displayText: string, maxCells: number): Line {
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
