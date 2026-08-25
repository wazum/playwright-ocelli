import assert from 'node:assert/strict'
import { test } from 'node:test'
import { qualifyingDiff } from './reporter.ts'

const diffAttachment = {
  name: 'price-diff.png',
  contentType: 'image/png',
  path: '/work/test-results/checkout/price-diff.png',
}

test('a failed comparison carrying a diff attachment qualifies', () => {
  const qualifying = qualifyingDiff(
    { expectedStatus: 'passed' },
    { status: 'failed', attachments: [diffAttachment] },
  )

  assert.equal(qualifying, diffAttachment.path)
})

test('a test.fail() that fails as expected carries a diff but qualifies not', () => {
  const qualifying = qualifyingDiff(
    { expectedStatus: 'failed' },
    { status: 'failed', attachments: [diffAttachment] },
  )

  assert.equal(qualifying, null)
})

test('a size mismatch produces no diff attachment and so nothing to draw', () => {
  const qualifying = qualifyingDiff(
    { expectedStatus: 'passed' },
    {
      status: 'failed',
      attachments: [{ name: 'price-actual.png', path: '/work/price-actual.png' }],
    },
  )

  assert.equal(qualifying, null)
})

test('a skipped result never qualifies', () => {
  const qualifying = qualifyingDiff(
    { expectedStatus: 'passed' },
    { status: 'skipped', attachments: [diffAttachment] },
  )

  assert.equal(qualifying, null)
})
