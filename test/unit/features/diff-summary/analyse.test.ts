import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { analyse } from '#src/features/diff-summary/analyse'

const oneDigitDiff = readFileSync(
  new URL('../../../fixtures/one-digit-diff.png', import.meta.url),
)
const wholeBackgroundDiff = readFileSync(
  new URL('../../../fixtures/whole-background-diff.png', import.meta.url),
)
const noMarkedPixels = readFileSync(
  new URL('../../../fixtures/no-marked-pixels.png', import.meta.url),
)

test('counts red pixels as different and yellow pixels as anti-aliased', () => {
  const summary = analyse(oneDigitDiff)

  assert.equal(summary.different, 63)
  assert.equal(summary.antialiased, 77)
})

test('bounding box spans red and anti-aliased pixels together', () => {
  const summary = analyse(oneDigitDiff)

  assert.deepEqual(summary.boundingBox, { x: 135, y: 84, width: 21, height: 28 })
})

test('an image with nothing marked has no bounding box', () => {
  const summary = analyse(noMarkedPixels)

  assert.equal(summary.boundingBox, null)
})

test('a diff filling the image is reported as the whole frame', () => {
  assert.equal(analyse(wholeBackgroundDiff).isWholeFrame, true)
  assert.equal(analyse(oneDigitDiff).isWholeFrame, false)
})
