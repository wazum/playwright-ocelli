export type Mode = 'auto' | 'blocks' | 'kitty' | 'off'

export type Options = {
  mode: Mode
  maxImages: number
  maxRows: number
  cellAspect: number
}

const MODES: Mode[] = ['auto', 'blocks', 'kitty', 'off']

const DEFAULTS: Options = {
  mode: 'auto',
  maxImages: 5,
  maxRows: 16,
  cellAspect: 2.1,
}

export function resolveOptions(given: Record<string, unknown>): Options {
  return {
    mode: asMode(given.mode),
    maxImages: (given.maxImages as number) ?? DEFAULTS.maxImages,
    maxRows: (given.maxRows as number) ?? DEFAULTS.maxRows,
    cellAspect: (given.cellAspect as number) ?? DEFAULTS.cellAspect,
  }
}

function asMode(value: unknown): Mode {
  if (value === undefined) return DEFAULTS.mode
  if (MODES.includes(value as Mode)) return value as Mode

  throw new Error(
    `ocelli: unknown mode ${JSON.stringify(value)}. Valid modes are ${MODES.join(', ')}.`,
  )
}
