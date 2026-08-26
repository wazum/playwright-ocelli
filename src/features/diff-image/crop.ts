import type { DecodedImage } from '../../playwright-internals.ts'
import { PNG } from '../../playwright-internals.ts'

type Box = { x: number; y: number; width: number; height: number }
type Frame = { width: number; height: number }
type Size = { columns: number; rows: number }

const BYTES_PER_PIXEL = 4

// Below this the change is a speck: the terminal averages it away and the
// picture says nothing the summary line did not already say.
const LEGIBLE_CELLS = 2
const SAMPLES_PER_ROW = 2
const LEAST_PADDING = 16

// The frame a full-page screenshot needs to be shown at makes a small change
// invisible. When that happens, show the change with a margin around it
// instead of a faithful picture of nothing.
export function cropFor(
  boundingBox: Box,
  frame: Frame,
  size: Size,
): Box | null {
  const cellsWide = boundingBox.width / (frame.width / size.columns)
  const cellsTall =
    boundingBox.height / (frame.height / (size.rows * SAMPLES_PER_ROW))

  if (cellsWide >= LEGIBLE_CELLS && cellsTall >= LEGIBLE_CELLS) return null

  const paddingX = Math.max(boundingBox.width, LEAST_PADDING)
  const paddingY = Math.max(boundingBox.height, LEAST_PADDING)
  const left = Math.max(0, boundingBox.x - paddingX)
  const top = Math.max(0, boundingBox.y - paddingY)
  const right = Math.min(frame.width, boundingBox.x + boundingBox.width + paddingX)
  const bottom = Math.min(
    frame.height,
    boundingBox.y + boundingBox.height + paddingY,
  )

  return { x: left, y: top, width: right - left, height: bottom - top }
}

// kitty is sent an encoded image, so a crop has to become its own PNG. The
// region is small by the time this is reached, which is the point of it.
export function cropped(image: DecodedImage, region: Box): Buffer {
  const rowBytes = region.width * BYTES_PER_PIXEL
  const data = Buffer.alloc(region.height * rowBytes)

  for (let row = 0; row < region.height; row++) {
    const from = ((region.y + row) * image.width + region.x) * BYTES_PER_PIXEL

    image.data.copy(data, row * rowBytes, from, from + rowBytes)
  }

  return PNG.sync.write({ width: region.width, height: region.height, data })
}
