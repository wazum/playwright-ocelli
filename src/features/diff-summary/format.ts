import type { DiffSummary } from './analyse.ts'

export function format(summary: DiffSummary) {
  if (summary.boundingBox === null) return line('diff colours not recognised')

  const terms = [`${summary.different} px different`]

  if (summary.antialiased > 0) {
    terms.push(`+${summary.antialiased} anti-aliased`)
  }

  terms.push(describeRegion(summary.boundingBox, summary.isWholeFrame))

  return line(terms.join(' · '))
}

function describeRegion(
  boundingBox: NonNullable<DiffSummary['boundingBox']>,
  isWholeFrame: boolean,
) {
  if (isWholeFrame) return 'whole frame'

  return `${boundingBox.width}×${boundingBox.height} at ${boundingBox.x},${boundingBox.y}`
}

function line(emit: string) {
  return { emit, visibleWidth: emit.length }
}
