import { getEastAsianWidth } from './playwright-internals.ts'

const graphemes = new Intl.Segmenter()
const NON_PRINTABLE = /[\p{Cc}\p{Cf}]/gu

export function line(displayText: string) {
  const emit = displayText.replace(NON_PRINTABLE, '')

  return { emit, visibleWidth: measureWidth(emit) }
}

function measureWidth(text: string) {
  let cells = 0

  for (const { segment } of graphemes.segment(text)) {
    cells += getEastAsianWidth.eastAsianWidth(segment.codePointAt(0)!)
  }

  return cells
}
