import { openSync, readSync, closeSync } from 'node:fs'

type Attachment = { name: string; path?: string }
type Size = { width: number; height: number }

const IHDR_END = 24
const WIDTH_AT = 16
const HEIGHT_AT = 20

// Playwright names the three attachments of one comparison <base>-diff.png,
// <base>-expected.png and <base>-actual.png.
export function frameSizes(attachments: Attachment[], diffName: string) {
  const base = diffName.replace(/-diff\.png$/, '')
  const expected = sizeOf(attachments, `${base}-expected.png`)
  const actual = sizeOf(attachments, `${base}-actual.png`)

  if (expected === null || actual === null) return null
  if (expected.width === actual.width && expected.height === actual.height) {
    return null
  }

  return { expected, actual }
}

function sizeOf(attachments: Attachment[], name: string): Size | null {
  const path = attachments.find((attachment) => attachment.name === name)?.path

  if (path === undefined) return null

  // Only the header is needed, and these frames are full screenshots.
  const header = Buffer.alloc(IHDR_END)
  let file

  try {
    file = openSync(path, 'r')

    if (readSync(file, header, 0, IHDR_END, 0) < IHDR_END) return null

    return {
      width: header.readUInt32BE(WIDTH_AT),
      height: header.readUInt32BE(HEIGHT_AT),
    }
  } catch {
    return null
  } finally {
    if (file !== undefined) closeSync(file)
  }
}
