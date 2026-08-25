import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'
import { reportLink } from './report-link.ts'

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
