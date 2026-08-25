import assert from 'node:assert/strict'
import { test } from 'node:test'
import { format } from './format.ts'

test('summary reads as pixel count, anti-aliasing, then bounding box', () => {
  const line = format({
    different: 63,
    antialiased: 77,
    boundingBox: { x: 135, y: 84, width: 21, height: 28 },
    isWholeFrame: false,
  })

  assert.equal(
    line.emit,
    '63 px different · +77 anti-aliased · 21×28 at 135,84',
  )
})

test('a frame-filling diff replaces the box with "whole frame"', () => {
  const line = format({
    different: 107492,
    antialiased: 950,
    boundingBox: { x: 0, y: 0, width: 480, height: 240 },
    isWholeFrame: true,
  })

  assert.equal(line.emit, '107492 px different · +950 anti-aliased · whole frame')
})

test('no anti-aliased pixels drops the term instead of printing +0', () => {
  const line = format({
    different: 12,
    antialiased: 0,
    boundingBox: { x: 10, y: 20, width: 3, height: 4 },
    isWholeFrame: false,
  })

  assert.equal(line.emit, '12 px different · 3×4 at 10,20')
})

test('visibleWidth counts the terminal cells the summary occupies', () => {
  const line = format({
    different: 12,
    antialiased: 0,
    boundingBox: { x: 10, y: 20, width: 3, height: 4 },
    isWholeFrame: false,
  })

  assert.equal(line.visibleWidth, 30)
})
