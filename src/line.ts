import { getEastAsianWidth } from './playwright-internals.ts'

const graphemes = new Intl.Segmenter()
const NON_PRINTABLE = /[\p{Cc}\p{Cf}]/gu
const OSC8 = '\x1b]8;;'
const BEL = '\x07'

export function line(displayText: string) {
  const emit = displayText.replace(NON_PRINTABLE, '')

  return { emit, visibleWidth: measureWidth(emit) }
}

export function hyperlink(displayText: string, target: string) {
  const { emit, visibleWidth } = line(displayText)

  return { emit: `${OSC8}${target}${BEL}${emit}${OSC8}${BEL}`, visibleWidth }
}

function measureWidth(text: string) {
  let cells = 0

  for (const { segment } of graphemes.segment(text)) {
    cells += getEastAsianWidth.eastAsianWidth(segment.codePointAt(0)!)
  }

  return cells
}
