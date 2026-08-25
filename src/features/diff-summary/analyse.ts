import { PNG } from 'playwright-core/lib/utilsBundle'

const BYTES_PER_PIXEL = 4

type DecodedImage = { width: number; height: number; data: Buffer }
type Marking = 'changed' | 'antialiased' | 'none'

export function analyse(diffImage: Buffer) {
  const image: DecodedImage = PNG.sync.read(diffImage)

  let different = 0
  let antialiased = 0
  let firstMarkedColumn = image.width
  let firstMarkedRow = image.height
  let lastMarkedColumn = -1
  let lastMarkedRow = -1

  for (let row = 0; row < image.height; row++) {
    for (let column = 0; column < image.width; column++) {
      const marking = markingAt(image, column, row)

      if (marking === 'none') continue

      if (marking === 'changed') different++
      else antialiased++

      firstMarkedColumn = Math.min(firstMarkedColumn, column)
      firstMarkedRow = Math.min(firstMarkedRow, row)
      lastMarkedColumn = Math.max(lastMarkedColumn, column)
      lastMarkedRow = Math.max(lastMarkedRow, row)
    }
  }

  const boundingBox = {
    x: firstMarkedColumn,
    y: firstMarkedRow,
    width: lastMarkedColumn - firstMarkedColumn + 1,
    height: lastMarkedRow - firstMarkedRow + 1,
  }

  return {
    different,
    antialiased,
    boundingBox,
    isWholeFrame:
      boundingBox.width === image.width && boundingBox.height === image.height,
  }
}

export type DiffSummary = ReturnType<typeof analyse>

function markingAt(image: DecodedImage, column: number, row: number): Marking {
  const offset = (row * image.width + column) * BYTES_PER_PIXEL
  const red = image.data[offset]
  const green = image.data[offset + 1]
  const blue = image.data[offset + 2]

  if (red === 255 && green === 0 && blue === 0) return 'changed'
  if (red === 255 && green === 255 && blue === 0) return 'antialiased'

  return 'none'
}
