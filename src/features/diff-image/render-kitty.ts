type Size = { columns: number; rows: number }

const APC = '\x1b_G'
const ST = '\x1b\\'
const TRANSMIT_AND_DISPLAY = 'a=T'
const PNG_FORMAT = 'f=100'
const SUPPRESS_REPLIES = 'q=2'
const MORE_CHUNKS_FOLLOW = 'm=1'
const FINAL_CHUNK = 'm=0'
const CHUNK_SIZE = 4096

export function renderKitty(png: Buffer, size: Size) {
  const chunks = splitIntoChunks(png.toString('base64'))
  const keys = [
    TRANSMIT_AND_DISPLAY,
    PNG_FORMAT,
    SUPPRESS_REPLIES,
    `c=${size.columns}`,
    `r=${size.rows}`,
  ].join(',')

  if (chunks.length === 1) {
    return { escape: apc(keys, chunks[0]), rows: size.rows }
  }

  const continuations = chunks
    .slice(1, -1)
    .map((chunk) => apc(MORE_CHUNKS_FOLLOW, chunk))

  return {
    escape:
      apc(`${keys},${MORE_CHUNKS_FOLLOW}`, chunks[0]) +
      continuations.join('') +
      apc(FINAL_CHUNK, chunks[chunks.length - 1]),
    rows: size.rows,
  }
}

function splitIntoChunks(payload: string) {
  const chunks = []

  for (let start = 0; start < payload.length; start += CHUNK_SIZE) {
    chunks.push(payload.slice(start, start + CHUNK_SIZE))
  }

  return chunks
}

function apc(keys: string, payload: string) {
  return `${APC}${keys};${payload}${ST}`
}
