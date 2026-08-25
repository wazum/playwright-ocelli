type Image = { width: number; height: number; data: Buffer }
type Size = { columns: number; rows: number }
type Colour = [number, number, number]

const UPPER_HALF_BLOCK = '▀'
const RESET = '\x1b[0m'
const SATURATION_RANGE = 256
const ANTIALIASED_TIER = SATURATION_RANGE
const DIFFERENT_TIER = SATURATION_RANGE * 2

export function renderBlocks(image: Image, size: Size) {
  const lines = []

  for (let row = 0; row < size.rows; row++) {
    const cells = []

    for (let column = 0; column < size.columns; column++) {
      cells.push(cellFor(image, size, column, row))
    }

    lines.push({ emit: cells.join('') + RESET, visibleWidth: size.columns })
  }

  return lines
}

function cellFor(image: Image, size: Size, column: number, row: number) {
  const left = Math.floor((column * image.width) / size.columns)
  const right = Math.max(
    Math.floor(((column + 1) * image.width) / size.columns),
    left + 1,
  )
  const top = Math.floor((row * image.height) / size.rows)
  const bottom = Math.floor(((row + 1) * image.height) / size.rows)
  const middle = Math.floor((top + bottom) / 2)
  const upperEnd = Math.max(middle, top + 1)
  const lowerStart = Math.min(middle, bottom - 1)

  const upper = severestIn(image, left, right, top, upperEnd)
  const lower = severestIn(image, left, right, lowerStart, bottom)

  return `\x1b[38;2;${upper.join(';')};48;2;${lower.join(';')}m${UPPER_HALF_BLOCK}`
}

function severestIn(
  image: Image,
  left: number,
  right: number,
  top: number,
  bottom: number,
): Colour {
  let severest: Colour = [0, 0, 0]
  let highestSeverity = -1

  for (let pixelRow = top; pixelRow < bottom; pixelRow++) {
    for (let pixelColumn = left; pixelColumn < right; pixelColumn++) {
      const colour = pixelAt(image, pixelColumn, pixelRow)
      const severity = severityOf(colour)

      if (severity > highestSeverity) {
        highestSeverity = severity
        severest = colour
      }
    }
  }

  return severest
}

function severityOf([red, green, blue]: Colour) {
  const saturation =
    Math.max(red, green, blue) - Math.min(red, green, blue)

  if (red === 255 && green === 0 && blue === 0) {
    return DIFFERENT_TIER + saturation
  }

  if (red === 255 && green === 255 && blue === 0) {
    return ANTIALIASED_TIER + saturation
  }

  return saturation
}

function pixelAt(image: Image, pixelColumn: number, pixelRow: number): Colour {
  const offset = (pixelRow * image.width + pixelColumn) * 4

  return [image.data[offset], image.data[offset + 1], image.data[offset + 2]]
}
