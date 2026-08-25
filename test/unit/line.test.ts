import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hyperlink, line, truncateStart } from '#src/line'

test('a wide grapheme takes two terminal cells', () => {
  assert.equal(line('価格').visibleWidth, 4)
})

test('the glyphs ocelli prints take one cell each', () => {
  assert.equal(line('▀…·✘×0').visibleWidth, 6)
})

test('control characters are stripped before the text is measured', () => {
  const measured = line('pri\nce\r\t\x07\x1b.png')

  assert.equal(measured.emit, 'price.png')
  assert.equal(measured.visibleWidth, 9)
})

test('a joined emoji survives whole instead of splitting into its parts', () => {
  const family = '\u{1f468}‍\u{1f469}‍\u{1f467}‍\u{1f466}'
  const measured = line(`${family}.png`)

  assert.equal(measured.emit, `${family}.png`)
  assert.equal(measured.visibleWidth, 6)
})

test('a flag takes the two cells a terminal gives it', () => {
  assert.equal(line('\u{1f1e6}\u{1f1f9}').visibleWidth, 2)
})

test('emoji presentation decides the width, not the character alone', () => {
  assert.equal(line('©').visibleWidth, 1)
  assert.equal(line('©️').visibleWidth, 2)
})

const RIGHT_TO_LEFT_OVERRIDE = 0x202e
const RIGHT_TO_LEFT_ISOLATE = 0x2067
const ARABIC_LETTER_MARK = 0x61c
const ZERO_WIDTH_SPACE = 0x200b
const SOFT_HYPHEN = 0xad
const WORD_JOINER = 0x2060
const INVISIBLE_SEPARATOR = 0x2063
const BYTE_ORDER_MARK = 0xfeff
const MONGOLIAN_VOWEL_SEPARATOR = 0x180e
const INHIBIT_SYMMETRIC_SWAPPING = 0x206a
const INTERLINEAR_ANNOTATION_ANCHOR = 0xfff9
const ZERO_WIDTH_JOINER = 0x200d

const hiding = (...codePoints: number[]) =>
  `pri${String.fromCodePoint(...codePoints)}ce.png`

test('characters that reorder a printed path are stripped', () => {
  for (const control of [
    RIGHT_TO_LEFT_OVERRIDE,
    RIGHT_TO_LEFT_ISOLATE,
    ARABIC_LETTER_MARK,
  ]) {
    const measured = line(hiding(control))

    assert.equal(measured.emit, 'price.png', `U+${control.toString(16)} stayed`)
    assert.equal(measured.visibleWidth, 9)
  }
})

test('characters that hide inside a printed path are stripped', () => {
  for (const invisible of [
    ZERO_WIDTH_SPACE,
    SOFT_HYPHEN,
    WORD_JOINER,
    INVISIBLE_SEPARATOR,
    BYTE_ORDER_MARK,
    MONGOLIAN_VOWEL_SEPARATOR,
    INHIBIT_SYMMETRIC_SWAPPING,
    INTERLINEAR_ANNOTATION_ANCHOR,
  ]) {
    const measured = line(hiding(invisible))

    assert.equal(measured.emit, 'price.png', `U+${invisible.toString(16)} stayed`)
    assert.equal(measured.visibleWidth, 9)
  }
})

test('the joiner emoji are built from is not stripped', () => {
  const joiner = String.fromCodePoint(ZERO_WIDTH_JOINER)

  assert.ok(line(hiding(ZERO_WIDTH_JOINER)).emit.includes(joiner))
})

test('a hyperlink wraps its display text in a BEL-terminated OSC 8', () => {
  const linked = hyperlink('report', 'file:///work/playwright-report/index.html')

  assert.equal(
    linked.emit,
    '\x1b]8;;file:///work/playwright-report/index.html\x07report\x1b]8;;\x07',
  )
})

test('a hyperlink measures its display text, not its escapes or target', () => {
  const linked = hyperlink('report', 'file:///work/playwright-report/index.html')

  assert.equal(linked.visibleWidth, 6)
})

test('text wider than the budget keeps its tail behind a leading ellipsis', () => {
  const truncated = truncateStart('tests/checkout/price-diff.png', 20)

  assert.equal(truncated.emit, '…kout/price-diff.png')
  assert.equal(truncated.visibleWidth, 20)
})

test('truncation drops a wide grapheme rather than overflow the budget', () => {
  const truncated = truncateStart('aaa価格', 4)

  assert.equal(truncated.emit, '…格')
  assert.equal(truncated.visibleWidth, 3)
})
