# ocelli

A Playwright reporter that prints screenshot diffs in your terminal, next to the
failure that produced them.

![ocelli printing a screenshot diff under the failing test](docs/media/blocks.gif)

When `toHaveScreenshot()` fails you ask one question: real regression, or
rendering noise? Answering it normally costs a context switch — find the path,
open the HTML report. ocelli answers it at the moment of failure, so you only
open the report when it is worth opening.

It replaces the `list` reporter: everything `list` prints, plus the diff image, a
one-line numeric summary, and a link into the report.

> Pre-release. Not published to npm yet.

## Install

```
npm install -D ocelli
```

```js
// playwright.config.ts
export default defineConfig({
  reporter: 'ocelli',
})
```

## Real images: `mode: 'kitty'`

By default you get block art, because it survives SSH, CI logs and every
terminal. **`auto` never selects kitty**, and runs no capability query at all —
terminals answer "supported" and then paint nothing, and silently invisible
output is the worst way a reporter can fail. So the real thing is opt-in:

```js
reporter: [['ocelli', { mode: 'kitty' }]]
```

That needs a terminal implementing the kitty graphics protocol. `OCELLI_MODE=kitty`
switches a single run without touching the config.

## Options

| option | default | meaning |
|---|---|---|
| `mode` | `'auto'` | `'auto'` \| `'blocks'` \| `'kitty'` \| `'off'` |
| `maxRows` | `16` | height budget per image |
| `cellAspect` | `2.1` | cell height ÷ width |

`auto` turns the image off when stdout is not a TTY or `CI` is set. An explicit
`blocks` or `kitty` overrides that — but colours must be on for any image to be
drawn, so a pipe also needs `FORCE_COLOR=1` or `PLAYWRIGHT_FORCE_TTY=100x40`.
Without colours you still get the summary and both destinations as plain text.

## Known limitations

- **kitty hands downscaling to the terminal.** On a full-page screenshot a small
  diff can vanish from the picture. The summary line always carries the numbers,
  which is why it sits above the image.
- **tmux swallows the image** unless `allow-passthrough` is on.
- **Retries print one image each**, matching how `list` prints retry lines.
- **Legacy Windows conhost** may not render `▀`.

## Requirements

Node 20.19+, `@playwright/test` 1.62+ as a peer dependency. Zero runtime
dependencies.

## Licence

MIT © Wolfgang Klinger
