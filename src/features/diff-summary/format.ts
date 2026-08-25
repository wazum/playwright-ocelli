import type { analyse } from './analyse.ts'

type Summary = ReturnType<typeof analyse>

export function format(summary: Summary) {
  const { bbox } = summary
  const parts = [`${summary.different} px different`]

  if (summary.antialiased > 0) {
    parts.push(`+${summary.antialiased} anti-aliased`)
  }

  parts.push(
    summary.isWholeFrame
      ? 'whole frame'
      : `${bbox.width}×${bbox.height} at ${bbox.x},${bbox.y}`,
  )

  const emit = parts.join(' · ')

  return { emit, visibleWidth: emit.length }
}
