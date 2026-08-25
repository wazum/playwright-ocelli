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
          key === 'enabled'
            ? true
            : (text: string) => `\x1b[2m${text}\x1b[22m`,
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

function passing() {
  return {
    status: 'passed',
    retry: 0,
    duration: 12,
    errors: [],
    steps: [],
    attachments: [],
  }
}

const CURSOR_UP = /\x1b\[(\d+)A/

test('a rewrite after an image moves up exactly the rows that were printed', () => {
  const written: string[] = []
  const reporter = new Ocelli({
    screen: fakeScreen(written),
    configDir: '/work',
    mode: 'blocks',
  })

  reporter.onConfigure(fakeConfig)
  reporter.onBegin(fakeSuite)

  const price = fakeTest('price renders', 19, 'test-a')
  const payment = fakeTest('payment renders', 23, 'test-b')
  const failure = failedWith(FIXTURE)
  const success = passing()

  reporter.onTestBegin(price, failure)
  reporter.onTestBegin(payment, success)

  const afterPaymentBegan = written.length - 1

  reporter.onTestEnd(price, failure)
  reporter.onTestEnd(payment, success)

  const rewriteAt = written.reduce(
    (last, chunk, index) => (CURSOR_UP.test(chunk) ? index : last),
    -1,
  )
  const movedUp = Number(written[rewriteAt].match(CURSOR_UP)?.[1])
  const newlinesSince = written
    .slice(afterPaymentBegan, rewriteAt)
    .join('')
    .split('\n').length - 1

  assert.ok(rewriteAt > afterPaymentBegan, 'no cursor rewrite was emitted')
  assert.equal(movedUp, newlinesSince)
})

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

test('a failed screenshot draws the diff below its summary', () => {
  const written = drive({ mode: 'blocks' })

  assert.ok(
    written.includes('38;2;255;0;0'),
    'no red diff pixel reached the terminal',
  )
})
