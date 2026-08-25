import type { DiffSummary } from './analyse.ts'

export function format(summary: DiffSummary) {
  const terms = [`${summary.different} px different`]

  if (summary.antialiased > 0) {
    terms.push(`+${summary.antialiased} anti-aliased`)
  }

  terms.push(describeRegion(summary))

  const emit = terms.join(' · ')

  return { emit, visibleWidth: emit.length }
}

function describeRegion({ boundingBox, isWholeFrame }: DiffSummary) {
  if (isWholeFrame) return 'whole frame'

  return `${boundingBox.width}×${boundingBox.height} at ${boundingBox.x},${boundingBox.y}`
}
