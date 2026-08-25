import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'
import {
  getEastAsianWidth,
  ListReporter,
  PNG,
  resolveInternals,
} from './playwright-internals.ts'

test('the private Playwright bundle resolves through the dependency chain', () => {
  assert.equal(typeof PNG.sync.read, 'function')
  assert.equal(typeof PNG.sync.write, 'function')
  assert.equal(getEastAsianWidth.eastAsianWidth('価'.codePointAt(0) ?? 0), 2)
  assert.equal(getEastAsianWidth.eastAsianWidth('a'.codePointAt(0) ?? 0), 1)
  assert.equal(typeof ListReporter, 'function')
  assert.ok(
    typeof ListReporter.prototype._updateLineCountAndNewLineFlagForOutput ===
      'function',
  )
})

test('an unreachable Playwright names itself rather than failing bare', (t) => {
  const elsewhere = mkdtempSync(join(tmpdir(), 'ocelli-'))
  t.after(() => rmSync(elsewhere, { recursive: true, force: true }))

  assert.throws(
    () => resolveInternals(pathToFileURL(join(elsewhere, 'ocelli.js')).href),
    /ocelli.*@playwright\/test/s,
  )
})
