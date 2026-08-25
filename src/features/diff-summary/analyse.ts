import { PNG } from 'playwright-core/lib/utilsBundle'

export function analyse(diff: Buffer) {
  const png = PNG.sync.read(diff)
  let different = 0
  let antialiased = 0
  let left = png.width
  let top = png.height
  let right = -1
  let bottom = -1

  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const offset = (y * png.width + x) * 4
      const red = png.data[offset]
      const green = png.data[offset + 1]
      const blue = png.data[offset + 2]

      if (red === 255 && green === 0 && blue === 0) different++
      else if (red === 255 && green === 255 && blue === 0) antialiased++
      else continue

      if (x < left) left = x
      if (x > right) right = x
      if (y < top) top = y
      if (y > bottom) bottom = y
    }
  }

  const bbox = {
    x: left,
    y: top,
    width: right - left + 1,
    height: bottom - top + 1,
  }

  return {
    different,
    antialiased,
    bbox,
    isWholeFrame: bbox.width === png.width && bbox.height === png.height,
  }
}
