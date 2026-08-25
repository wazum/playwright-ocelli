import assert from 'node:assert/strict'
import { test } from 'node:test'
import { qualifyingDiffs } from '#src/qualifying-diffs'

const diffAttachment = {
  name: 'price-diff.png',
  contentType: 'image/png',
  path: '/work/test-results/checkout/price-diff.png',
}

test('a failed comparison carrying a diff attachment qualifies', () => {
  const qualifying = qualifyingDiffs(
    { expectedStatus: 'passed' },
    { status: 'failed', attachments: [diffAttachment] },
  )

  assert.deepEqual(qualifying, [diffAttachment.path])
})

test('a test.fail() that fails as expected carries a diff but qualifies not', () => {
  const qualifying = qualifyingDiffs(
    { expectedStatus: 'failed' },
    { status: 'failed', attachments: [diffAttachment] },
  )

  assert.deepEqual(qualifying, [])
})

test('a size mismatch produces no diff attachment and so nothing to draw', () => {
  const qualifying = qualifyingDiffs(
    { expectedStatus: 'passed' },
    {
      status: 'failed',
      attachments: [
        { name: 'price-actual.png', path: '/work/price-actual.png' },
      ],
    },
  )

  assert.deepEqual(qualifying, [])
})

test('every diff on one result qualifies, not just the first', () => {
  const second = { name: 'total-diff.png', path: '/work/total-diff.png' }

  const qualifying = qualifyingDiffs(
    { expectedStatus: 'passed' },
    { status: 'failed', attachments: [diffAttachment, second] },
  )

  assert.deepEqual(qualifying, [diffAttachment.path, second.path])
})

test('a skipped result never qualifies', () => {
  const qualifying = qualifyingDiffs(
    { expectedStatus: 'passed' },
    { status: 'skipped', attachments: [diffAttachment] },
  )

  assert.deepEqual(qualifying, [])
})
