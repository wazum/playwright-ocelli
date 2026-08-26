import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cropFor, cropped } from '#src/features/diff-image/crop'
import { fit } from '#src/features/diff-image/fit'
import { PNG } from '#src/playwright-internals'

const sizeFor = (width: number, height: number) =>
  fit({
    imageWidth: width,
    imageHeight: height,
    maxColumns: 93,
    maxRows: 16,
    cellAspect: 2.1,
  })

test('a diff big enough to see is left in its whole frame', () => {
  const frame = { width: 480, height: 240 }

  assert.equal(
    cropFor({ x: 135, y: 84, width: 21, height: 28 }, frame, sizeFor(480, 240)),
    null,
  )
})

test('a whole-frame diff is never cropped', () => {
  const frame = { width: 480, height: 240 }

  assert.equal(
    cropFor({ x: 0, y: 0, width: 480, height: 240 }, frame, sizeFor(480, 240)),
    null,
  )
})

test('a diff lost in a full-page screenshot is cropped around', () => {
  const frame = { width: 1280, height: 4000 }
  const region = cropFor(
    { x: 600, y: 1000, width: 100, height: 30 },
    frame,
    sizeFor(1280, 4000),
  )

  assert.deepEqual(region, { x: 500, y: 970, width: 300, height: 90 })
})

test('a crop at the frame edge stays inside the frame', () => {
  const frame = { width: 1280, height: 4000 }
  const region = cropFor({ x: 0, y: 0, width: 40, height: 20 }, frame, sizeFor(1280, 4000))

  assert.deepEqual(region, { x: 0, y: 0, width: 80, height: 40 })
})

test('cropping re-encodes only the region, keeping its pixels', () => {
  const width = 4
  const height = 2
  const data = Buffer.alloc(width * height * 4, 0)

  // A single red pixel at (2, 1), everything else opaque black.
  for (let index = 0; index < width * height; index++) {
    data.set([0, 0, 0, 255], index * 4)
  }

  data.set([255, 0, 0, 255], (1 * width + 2) * 4)

  const region = { x: 2, y: 1, width: 2, height: 1 }
  const out = PNG.sync.read(cropped({ width, height, data }, region))

  assert.equal(out.width, 2)
  assert.equal(out.height, 1)
  assert.deepEqual([...out.data.subarray(0, 4)], [255, 0, 0, 255])
  assert.deepEqual([...out.data.subarray(4, 8)], [0, 0, 0, 255])
})

test('a thin full-width line is cropped vertically only', () => {
  const frame = { width: 1280, height: 4000 }
  const region = cropFor({ x: 0, y: 2000, width: 1280, height: 2 }, frame, sizeFor(1280, 4000))

  assert.deepEqual(region, { x: 0, y: 1984, width: 1280, height: 34 })
})
