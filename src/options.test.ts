import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolveOptions } from './options.ts'

test('unset options fall back to the documented defaults', () => {
  assert.deepEqual(resolveOptions({}), {
    mode: 'auto',
    maxImages: 5,
    maxRows: 16,
    cellAspect: 2.1,
  })
})

test('an unknown mode is rejected, naming it and the valid ones', () => {
  assert.throws(
    () => resolveOptions({ mode: 'kity' }),
    /kity.*auto, blocks, kitty, off/s,
  )
})

test('Playwright constructor extras do not leak into the options', () => {
  const resolved = resolveOptions({
    maxRows: 8,
    configDir: '/work/e2e',
    _mode: 'default',
  })

  assert.deepEqual(resolved, {
    mode: 'auto',
    maxImages: 5,
    maxRows: 8,
    cellAspect: 2.1,
  })
})
