type Attachment = { name: string; path?: string }

export type TestResult = { status: string; attachments: Attachment[] }

const DIFF_SUFFIX = '-diff.png'

export function qualifyingDiffs(
  test: { expectedStatus: string },
  result: TestResult,
): string[] {
  if (result.status === 'skipped') return []
  if (result.status === test.expectedStatus) return []

  return result.attachments.flatMap((attachment) =>
    attachment.name.endsWith(DIFF_SUFFIX) && attachment.path
      ? [attachment.path]
      : [],
  )
}
