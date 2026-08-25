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
  verifyInternals,
} from '#src/playwright-internals'

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

test('the installed Playwright satisfies the surface ocelli checks for', () => {
  const installed = { PNG, getEastAsianWidth, ListReporter }

  assert.equal(verifyInternals(installed, '1.62.1'), installed)
})

test('a renamed private method is named in the error, with the version', () => {
  class WithoutTheRewriteHooks {}

  assert.throws(
    () =>
      verifyInternals(
        { PNG, getEastAsianWidth, ListReporter: WithoutTheRewriteHooks },
        '9.9.9',
      ),
    (error: Error) => {
      assert.match(error.message, /9\.9\.9/)
      assert.match(error.message, /_maybeWriteNewLine/)
      assert.match(error.message, /_updateLineCountAndNewLineFlagForOutput/)

      return true
    },
  )
})

test('a missing bundle export is named without mentioning the intact ones', () => {
  assert.throws(
    () => verifyInternals({ getEastAsianWidth, ListReporter }, '9.9.9'),
    (error: Error) => {
      assert.match(error.message, /PNG/)
      assert.doesNotMatch(error.message, /getEastAsianWidth/)

      return true
    },
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
