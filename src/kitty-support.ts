// Not a capability query: terminals answer one wrongly. These name themselves
// in the environment.
const MARKERS = ['KITTY_WINDOW_ID', 'WEZTERM_PANE']
const NAMES = /kitty|ghostty|wezterm/i

export function looksKittyCapable(environment: NodeJS.ProcessEnv) {
  if (MARKERS.some((marker) => environment[marker])) return true

  return NAMES.test(`${environment.TERM} ${environment.TERM_PROGRAM}`)
}
