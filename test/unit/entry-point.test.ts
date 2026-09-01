import assert from 'node:assert/strict'
import { test } from 'node:test'
import Ocelli from '#src/reporter'
import type { Mode, Options } from '#src/reporter'

// A config author should be able to name the shape they are passing. If these
// types are not exported from the entry point, the typecheck fails here.
const configured: Options = {
  mode: 'kitty',
  maxImages: 3,
  maxRows: 20,
  cellAspect: 2.1,
}

const partial: Options = { maxImages: 3 }

const modes: Mode[] = ['auto', 'blocks', 'kitty', 'off']

test('the entry point exports the option types it accepts', () => {
  assert.equal(configured.mode, 'kitty')
  assert.equal(partial.maxImages, 3)
  assert.equal(modes.length, 4)
})

test('the entry point exports the reporter and nothing else at runtime', async () => {
  const entry = await import('#src/reporter')

  assert.deepEqual(Object.keys(entry), ['default'])
  assert.equal(entry.default, Ocelli)
})
