import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolveMode, resolveOptions } from '#src/options'

const COLOURED_TERMINAL = { isTTY: true, hasColours: true, isCI: false }

test('unset options fall back to the documented defaults', () => {
  assert.deepEqual(resolveOptions({}), {
    mode: 'auto',
    maxImages: 5,
    maxRows: 16,
    cellAspect: 2.1,
  })
})

test('auto settles on blocks, never on kitty, without asking the terminal', () => {
  assert.equal(resolveMode('auto', COLOURED_TERMINAL), 'blocks')
})

test('auto prints no image outside a TTY', () => {
  assert.equal(
    resolveMode('auto', { ...COLOURED_TERMINAL, isTTY: false }),
    'off',
  )
})

test('auto prints no image on CI', () => {
  assert.equal(resolveMode('auto', { ...COLOURED_TERMINAL, isCI: true }), 'off')
})

test('an explicitly chosen mode overrides the CI and TTY gates', () => {
  const piped = { isTTY: false, hasColours: true, isCI: true }

  assert.equal(resolveMode('blocks', piped), 'blocks')
  assert.equal(resolveMode('kitty', piped), 'kitty')
})

test('stripped colours mean no image, whatever the mode asked for', () => {
  const colourless = { ...COLOURED_TERMINAL, hasColours: false }

  assert.equal(resolveMode('kitty', colourless), 'off')
  assert.equal(resolveMode('blocks', colourless), 'off')
})

test('OCELLI_MODE overrides the configured mode for one run', (t) => {
  process.env.OCELLI_MODE = 'kitty'
  t.after(() => {
    delete process.env.OCELLI_MODE
  })

  assert.equal(resolveOptions({ mode: 'off' }).mode, 'kitty')
})

test('a maxRows that cannot size an image is rejected by name', () => {
  assert.throws(() => resolveOptions({ maxRows: 'tall' }), /maxRows/)
  assert.throws(() => resolveOptions({ maxRows: 0 }), /maxRows/)
  assert.throws(() => resolveOptions({ maxRows: Number.NaN }), /maxRows/)
})

test('maxImages may be zero but not negative or fractional', () => {
  assert.equal(resolveOptions({ maxImages: 0 }).maxImages, 0)
  assert.throws(() => resolveOptions({ maxImages: -1 }), /maxImages/)
  assert.throws(() => resolveOptions({ maxImages: 1.5 }), /maxImages/)
})

test('a cellAspect that would divide by zero is rejected by name', () => {
  assert.throws(() => resolveOptions({ cellAspect: 0 }), /cellAspect/)
  assert.throws(() => resolveOptions({ cellAspect: -2.1 }), /cellAspect/)
  assert.equal(resolveOptions({ cellAspect: 1.8 }).cellAspect, 1.8)
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
    _commandHash: 'a1b2c3',
  })

  assert.deepEqual(resolved, {
    mode: 'auto',
    maxImages: 5,
    maxRows: 8,
    cellAspect: 2.1,
  })
})
