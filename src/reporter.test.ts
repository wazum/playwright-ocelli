import assert from 'node:assert/strict'
import { test } from 'node:test'
import Ocelli, { qualifyingDiff } from './reporter.ts'

const diffAttachment = {
  name: 'price-diff.png',
  contentType: 'image/png',
  path: '/work/test-results/checkout/price-diff.png',
}

const FIXTURE = new URL('./fixtures/one-digit-diff.png', import.meta.url)
  .pathname

function fakeScreen(written: string[]) {
  return {
    isTTY: true,
    ttyWidth: 80,
    ttyHeight: 200,
    colors: new Proxy(
      {},
      {
        get: (_target, key) =>
          key === 'enabled' ? true : (text: string) => text,
      },
    ),
    stdout: {
      write: (chunk: string) => {
        written.push(String(chunk))

        return true
      },
    },
  }
}

const fakeConfig = {
  rootDir: '/work',
  workers: 1,
  version: '1.62.1',
  metadata: { actualWorkers: 1 },
  tags: [],
  reporter: [],
}

const fakeSuite = { allTests: () => [], suites: [], tests: [], titlePath: () => [] }

function fakeTest(title: string, line: number, id: string) {
  const project = { name: '', outputDir: '/work/test-results' }

  return {
    title,
    id,
    location: { file: '/work/tests/checkout.spec.ts', line, column: 1 },
    expectedStatus: 'passed',
    outcome: () => 'unexpected',
    titlePath: () => ['', '', 'checkout.spec.ts', title],
    parent: { project: () => project },
    results: [],
    retries: 0,
    tags: [],
  }
}

function failedWith(path: string) {
  return {
    status: 'failed',
    retry: 0,
    duration: 188,
    errors: [],
    steps: [],
    attachments: [{ name: 'price-diff.png', contentType: 'image/png', path }],
  }
}

function drive(options: Record<string, unknown> = {}) {
  const written: string[] = []
  const reporter = new Ocelli({
    screen: fakeScreen(written),
    configDir: '/work',
    ...options,
  })

  reporter.onConfigure(fakeConfig)
  reporter.onBegin(fakeSuite)

  const price = fakeTest('price renders', 19, 'test-a')
  const result = failedWith(FIXTURE)

  reporter.onTestBegin(price, result)
  reporter.onTestEnd(price, result)

  return written.join('')
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

test('a failed screenshot prints its summary under the list line', () => {
  const written = drive({ mode: 'blocks' })

  assert.ok(
    written.includes('63 px different · +77 anti-aliased · 21×28 at 135,84'),
    'the summary line never reached stdout',
  )
})
