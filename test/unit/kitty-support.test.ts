import assert from 'node:assert/strict'
import { test } from 'node:test'
import { looksKittyCapable } from '#src/kitty-support'

test('kitty, ghostty and wezterm name themselves in the environment', () => {
  for (const environment of [
    { KITTY_WINDOW_ID: '1' },
    { TERM: 'xterm-kitty' },
    { TERM: 'xterm-ghostty' },
    { TERM_PROGRAM: 'ghostty' },
    { TERM_PROGRAM: 'WezTerm' },
    { WEZTERM_PANE: '0' },
  ]) {
    assert.ok(looksKittyCapable(environment), JSON.stringify(environment))
  }
})

test('a terminal that says nothing is not taken for a capable one', () => {
  for (const environment of [
    {},
    { TERM: 'xterm-256color' },
    { TERM: 'screen-256color', TERM_PROGRAM: 'tmux' },
    { TERM: 'xterm-256color', TERM_PROGRAM: 'Apple_Terminal' },
    { TERM: 'dumb' },
  ]) {
    assert.equal(
      looksKittyCapable(environment),
      false,
      JSON.stringify(environment),
    )
  }
})
