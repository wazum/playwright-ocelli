import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'
import { reportLink } from '#src/features/report-link'

test('no html reporter configured means no report link', () => {
  assert.equal(reportLink('/work', [['list'], ['json']], 'abc123'), null)
})

test('an outputFolder option resolves against the config directory', () => {
  const link = reportLink(
    '/work/e2e',
    [['list'], ['html', { outputFolder: 'out/report' }]],
    'abc123',
  )

  assert.equal(link, 'file:///work/e2e/out/report/index.html#?testId=abc123')
})

test('a space and a hash in the folder survive into the URL', () => {
  const link = reportLink(
    '/work',
    [['html', { outputFolder: 'my report #2' }]],
    'abc123',
  )

  assert.equal(
    link,
    'file:///work/my%20report%20%232/index.html#?testId=abc123',
  )
})

test('PLAYWRIGHT_HTML_OUTPUT_DIR wins over the legacy variable and the config', (t) => {
  process.env.PLAYWRIGHT_HTML_OUTPUT_DIR = '/env/report'
  process.env.PLAYWRIGHT_HTML_REPORT = '/legacy/report'
  t.after(() => {
    delete process.env.PLAYWRIGHT_HTML_OUTPUT_DIR
    delete process.env.PLAYWRIGHT_HTML_REPORT
  })

  const link = reportLink(
    '/work/e2e',
    [['html', { outputFolder: 'out/report' }]],
    'abc123',
  )

  assert.equal(link, 'file:///env/report/index.html#?testId=abc123')
})

test('the legacy PLAYWRIGHT_HTML_REPORT still overrides the outputFolder', (t) => {
  process.env.PLAYWRIGHT_HTML_REPORT = '/legacy/report'
  t.after(() => {
    delete process.env.PLAYWRIGHT_HTML_REPORT
  })

  const link = reportLink(
    '/work/e2e',
    [['html', { outputFolder: 'out/report' }]],
    'abc123',
  )

  assert.equal(link, 'file:///legacy/report/index.html#?testId=abc123')
})

test('an empty environment variable is ignored, as Playwright ignores it', (t) => {
  process.env.PLAYWRIGHT_HTML_OUTPUT_DIR = ''
  t.after(() => {
    delete process.env.PLAYWRIGHT_HTML_OUTPUT_DIR
  })

  const link = reportLink(
    '/work/e2e',
    [['html', { outputFolder: 'out/report' }]],
    'abc123',
  )

  assert.equal(link, 'file:///work/e2e/out/report/index.html#?testId=abc123')
})

test('an empty outputFolder falls back to the default folder', (t) => {
  const repository = mkdtempSync(join(tmpdir(), 'ocelli-'))

  t.after(() => rmSync(repository, { recursive: true, force: true }))
  writeFileSync(join(repository, 'package.json'), '{}')

  const link = reportLink(repository, [['html', { outputFolder: '' }]], 'abc123')

  const expected = pathToFileURL(
    join(repository, 'playwright-report', 'index.html'),
  )
  expected.hash = '?testId=abc123'

  assert.equal(link, expected.href)
})

test('the default folder sits beside the nearest package.json above the config', (t) => {
  const repository = mkdtempSync(join(tmpdir(), 'ocelli-'))
  const configDir = join(repository, 'packages', 'e2e')

  t.after(() => rmSync(repository, { recursive: true, force: true }))
  mkdirSync(configDir, { recursive: true })
  writeFileSync(join(repository, 'package.json'), '{}')

  const link = reportLink(configDir, [['html']], 'abc123')

  const expected = pathToFileURL(
    join(repository, 'playwright-report', 'index.html'),
  )
  expected.hash = '?testId=abc123'

  assert.equal(link, expected.href)
})
