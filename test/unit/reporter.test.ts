import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'
import Ocelli from '#src/reporter'

const diffAttachment = {
  name: 'price-diff.png',
  contentType: 'image/png',
  path: '/work/test-results/checkout/price-diff.png',
}

const FIXTURE = new URL('../fixtures/one-digit-diff.png', import.meta.url)
  .pathname

function fakeScreen(written: string[], colours = true) {
  return {
    isTTY: true,
    ttyWidth: 80,
    ttyHeight: 200,
    colors: new Proxy(
      {},
      {
        get: (_target, key) =>
          key === 'enabled'
            ? colours
            : (text: string) =>
                colours ? `\x1b[2m${text}\x1b[22m` : text,
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

function drive(
  options: Record<string, unknown> = {},
  configOverrides: Record<string, unknown> = {},
) {
  const written: string[] = []
  const reporter = new Ocelli({
    screen: fakeScreen(written),
    configDir: process.cwd(),
    ...options,
  })

  reporter.onConfigure({ ...fakeConfig, ...configOverrides })
  reporter.onBegin(fakeSuite)

  const price = fakeTest('price renders', 19, 'test-a')
  const result = failedWith(FIXTURE)

  reporter.onTestBegin(price, result)
  reporter.onTestEnd(price, result)

  return written.join('')
}

test('a screen without the parts ocelli writes through is rejected at once', () => {
  assert.throws(
    () => new Ocelli({ screen: { isTTY: true, ttyWidth: 80 } }),
    (error: Error) => {
      assert.match(error.message, /screen/)
      assert.match(error.message, /@playwright\/test/)

      return true
    },
  )
})

test('without colours the destinations survive as visible text', () => {
  const written: string[] = []
  const reporter = new Ocelli({
    screen: fakeScreen(written, false),
    configDir: process.cwd(),
    mode: 'blocks',
  })

  reporter.onConfigure({ ...fakeConfig, reporter: [['html']] })
  reporter.onBegin(fakeSuite)

  const failing = fakeTest('price renders', 19, 'test-a')
  const result = failedWith(FIXTURE)

  reporter.onTestBegin(failing, result)
  reporter.onTestEnd(failing, result)

  const output = written.join('')

  assert.ok(!output.includes('\x1b]8;;'), 'a hyperlink would be stripped away')
  assert.ok(output.includes('test/fixtures/one-digit-diff.png'), 'lost the path')
  assert.ok(
    output.includes('playwright-report/index.html#?testId=test-a'),
    'the report URL vanished instead of being printed',
  )
})

function driveFailures(count: number, options: Record<string, unknown> = {}) {
  const written: string[] = []
  const reporter = new Ocelli({
    screen: fakeScreen(written),
    configDir: process.cwd(),
    ...options,
  })

  reporter.onConfigure(fakeConfig)
  reporter.onBegin(fakeSuite)

  for (let index = 0; index < count; index++) {
    const failing = fakeTest(`case ${index}`, 19 + index, `test-${index}`)
    const result = failedWith(FIXTURE)

    reporter.onTestBegin(failing, result)
    reporter.onTestEnd(failing, result)
  }

  return written.join('')
}

test('the image budget stops later images and says so once', () => {
  const written = driveFailures(3, { mode: 'kitty', maxImages: 1 })

  assert.equal(written.split('\x1b_Ga=T').length - 1, 1, 'drew too many images')
  assert.equal(written.split('maxImages').length - 1, 1, 'notice not printed once')
  assert.equal(written.split('px different').length - 1, 3, 'lost a summary')
})

test('a run with snapshot failures ends by saying how to accept them', async () => {
  const written: string[] = []
  const reporter = new Ocelli({
    screen: fakeScreen(written),
    configDir: process.cwd(),
    mode: 'off',
  })

  reporter.onConfigure(fakeConfig)
  reporter.onBegin(fakeSuite)

  for (const index of [0, 1]) {
    const failing = fakeTest(`case ${index}`, 19 + index, `test-${index}`)
    const result = failedWith(FIXTURE)

    reporter.onTestBegin(failing, result)
    reporter.onTestEnd(failing, result)
  }

  await reporter.onEnd({ status: 'failed' })

  assert.ok(
    written
      .join('')
      .includes(
        '2 snapshots differ · accept with: npx playwright test --update-snapshots',
      ),
    'no acceptance hint at the end of the run',
  )
})

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

function driveTwoTests(mode: string) {
  const written: string[] = []
  const reporter = new Ocelli({
    screen: fakeScreen(written),
    configDir: process.cwd(),
    mode,
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
  const newlinesSince =
    written.slice(afterPaymentBegan, rewriteAt).join('').split('\n').length - 1
  const declaredRows = Number(
    written.join('').match(/\x1b_Ga=T[^;]*,r=(\d+)/)?.[1] ?? 1,
  )

  assert.ok(rewriteAt > afterPaymentBegan, 'no cursor rewrite was emitted')

  return { movedUp, newlinesSince, declaredRows }
}

test('a rewrite after block art moves up exactly the rows printed', () => {
  const { movedUp, newlinesSince } = driveTwoTests('blocks')

  assert.equal(movedUp, newlinesSince)
})

test('a rewrite after a kitty image counts the rows the escape claims', () => {
  const { movedUp, newlinesSince, declaredRows } = driveTwoTests('kitty')

  assert.equal(movedUp, newlinesSince + declaredRows - 1)
})

test('two soft screenshot assertions both reach the terminal', () => {
  const written: string[] = []
  const reporter = new Ocelli({
    screen: fakeScreen(written),
    configDir: process.cwd(),
    mode: 'kitty',
  })

  reporter.onConfigure(fakeConfig)
  reporter.onBegin(fakeSuite)

  const failing = fakeTest('price renders', 19, 'test-a')
  const result = failedWith(FIXTURE)
  result.attachments.push({
    name: 'total-diff.png',
    contentType: 'image/png',
    path: FIXTURE,
  })

  reporter.onTestBegin(failing, result)
  reporter.onTestEnd(failing, result)

  const output = written.join('')

  assert.equal(output.split('px different').length - 1, 2, 'lost a summary')
  assert.equal(output.split('\x1b_Ga=T').length - 1, 2, 'lost an image')
})

test('a failed screenshot prints its summary under the list line', () => {
  const written = drive({ mode: 'blocks' })

  assert.ok(
    written.includes('63 px different · +77 anti-aliased · 21×28 at 135,84'),
    'the summary line never reached stdout',
  )
})

test('kitty mode sends an image escape instead of block glyphs', () => {
  const written = drive({ mode: 'kitty' })

  assert.ok(written.includes('\x1b_Ga=T,f=100,q=2,'), 'no kitty image escape')
  assert.ok(!written.includes('▀'), 'block glyphs leaked into kitty mode')
})

test('the diff path is printed as a hyperlink to the file', () => {
  const written = drive({ mode: 'blocks' })

  assert.ok(
    written.includes(`\x1b]8;;${pathToFileURL(FIXTURE).href}\x07`),
    'no hyperlink to the diff file was printed',
  )
  assert.ok(written.includes('test/fixtures/one-digit-diff.png'))
})

test('the report link appears only when html is configured', () => {
  const withoutHtml = drive({ mode: 'blocks' })
  const withHtml = drive({ mode: 'blocks' }, { reporter: [['html']] })

  assert.ok(!withoutHtml.includes('\x07report\x1b]8;;'))
  assert.ok(withHtml.includes('\x07report\x1b]8;;'))
  assert.ok(withHtml.includes('playwright-report/index.html#?testId=test-a'))
})

test('a failed screenshot draws the diff below its summary', () => {
  const written = drive({ mode: 'blocks' })

  assert.ok(
    written.includes('38;2;255;0;0'),
    'no red diff pixel reached the terminal',
  )
})
