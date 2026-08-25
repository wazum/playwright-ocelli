import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hyperlink, line } from './line.ts'

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
