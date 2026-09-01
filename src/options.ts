export type Mode = 'auto' | 'blocks' | 'kitty' | 'off'

export type ResolvedMode = Exclude<Mode, 'auto'>

export type Environment = {
  isTTY: boolean
  hasColours: boolean
  isCI: boolean
}

export type Options = {
  mode?: Mode
  maxImages?: number
  maxRows?: number
  cellAspect?: number
}

export type ResolvedOptions = Required<Options>

const MODES: Mode[] = ['auto', 'blocks', 'kitty', 'off']

const DEFAULTS: ResolvedOptions = {
  mode: 'auto',
  maxImages: 5,
  maxRows: 16,
  cellAspect: 2.1,
}

export function resolveOptions(
  given: Record<string, unknown>,
): ResolvedOptions {
  return {
    mode: asMode(process.env.OCELLI_MODE || given.mode),
    maxImages: asWholeNumber(given.maxImages, 'maxImages', 0),
    maxRows: asWholeNumber(given.maxRows, 'maxRows', 1),
    cellAspect: asPositiveNumber(given.cellAspect, 'cellAspect'),
  }
}

function asWholeNumber(value: unknown, name: 'maxImages' | 'maxRows', least: number) {
  if (value === undefined) return DEFAULTS[name]

  if (typeof value !== 'number' || !Number.isInteger(value) || value < least) {
    throw new Error(
      `ocelli: ${name} must be a whole number of at least ${least}, got ${JSON.stringify(value)}.`,
    )
  }

  return value
}

function asPositiveNumber(value: unknown, name: 'cellAspect') {
  if (value === undefined) return DEFAULTS[name]

  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(
      `ocelli: ${name} must be a positive number, got ${JSON.stringify(value)}.`,
    )
  }

  return value
}

export function resolveMode(
  configured: Mode,
  environment: Environment,
): ResolvedMode {
  if (!environment.hasColours) return 'off'
  if (configured !== 'auto') return configured
  if (!environment.isTTY || environment.isCI) return 'off'

  return 'blocks'
}

function asMode(value: unknown): Mode {
  if (value === undefined) return DEFAULTS.mode
  if (MODES.includes(value as Mode)) return value as Mode

  throw new Error(
    `ocelli: unknown mode ${JSON.stringify(value)}. Valid modes are ${MODES.join(', ')}.`,
  )
}
