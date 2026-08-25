type TestCase = { expectedStatus: string }
type Attachment = { name: string; path?: string }
type TestResult = { status: string; attachments: Attachment[] }

const DIFF_SUFFIX = '-diff.png'

export function qualifyingDiff(test: TestCase, result: TestResult) {
  if (result.status === 'skipped') return null
  if (result.status === test.expectedStatus) return null

  const diff = result.attachments.find(
    (attachment) => attachment.name.endsWith(DIFF_SUFFIX) && attachment.path,
  )

  return diff?.path ?? null
}
