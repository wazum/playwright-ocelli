# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- A run that printed block art in kitty, ghostty or wezterm ends by naming
  `mode: 'kitty'` once, and only while `mode` is left at `auto`. A `mode:
  'kitty'` that no terminal in the environment claims to support is reported
  the same way, rather than printing nothing visible.
- `list` configured next to ocelli, which replaces it, is called out at the top
  of the run instead of quietly printing every test twice.

### Changed

- `Options` describes what a config may pass, so naming one option is enough.
  It listed all four as required, which meant the documented
  `{ maxImages: 3, maxRows: 20 }` did not satisfy the type it was checked
  against.
- A misspelled option is rejected by name at startup instead of doing nothing.
  Playwright's own constructor arguments are still accepted.

### Fixed

- A size mismatch is named whenever the frames differ, not only when the diff
  came back unmarked. Playwright pads the shorter frame and compares anyway, so
  over a dark page the padding is marked red — those runs reported
  `20000 px different · 400×50 at 0,150` and never mentioned the size change.
- An empty `OCELLI_MODE` leaves the configured mode alone instead of failing the
  run with `unknown mode ""`. A CI expression that resolves to nothing sets the
  variable to an empty string.
- The destinations are printed as plain text outside a terminal, not only when
  colours are off. `FORCE_COLOR=1` in CI used to emit OSC 8 hyperlinks into
  logs that have nothing to click.
- A snapshot that differed and then passed on retry is no longer offered for
  acceptance. A green run said `1 snapshot differs · accept with: … --update-snapshots`,
  and taking that advice writes the flake into the baseline.

## [0.2.0] - 2026-08-26

### Added

- The image is cropped to the change, with a margin, when the frame is large
  enough to make it invisible. A small diff in a full-page screenshot used to
  render as one or two cells; the summary line now says `cropped to the change`.
- A size mismatch reports `size differs · expected 400×200, got 300×150` from
  the expected and actual attachments, rather than `diff colours not
  recognised`, and draws no image.
- `Mode` and `Options` are exported from the entry point.
- npm keywords, so the package is findable by search.

### Fixed

- A retried snapshot is counted once in the closing line. With `retries: 1` a
  single differing snapshot was reported as two.
- A diff that cannot be read prints `diff could not be read` instead of
  throwing. Playwright counts a throwing reporter as a failed run, so a
  vanished or half-written file could fail a run whose tests all passed.
- The acceptance hint names the package manager the run was started with, so a
  pnpm or yarn user is no longer told to use `npx`.
- No image is drawn when nothing is marked, instead of sixteen rows of grey.

## [0.1.1] - 2026-08-25

### Fixed

- `ocelli/package.json` is resolvable again. `exports` declared only the root
  entry, so tooling that reads a dependency's manifest got
  `ERR_PACKAGE_PATH_NOT_EXPORTED`.

## [0.1.0] - 2026-08-25

First release.

### Added

- A Playwright reporter that replaces `list` and prints the screenshot diff of a
  failed `toHaveScreenshot()` under the test that produced it.
- A numeric summary above each image: pixels different, anti-aliased pixels
  counted separately, and the bounding box of the change.
- Half-block rendering by default, ranking red above anti-aliasing when
  downscaling so a small diff cannot be averaged away.
- `mode: 'kitty'` to transmit the real image with the kitty graphics protocol.
  `auto` never selects it, and no terminal capability query is made.
- OSC 8 hyperlinks to the diff file and to that test in the HTML report, printed
  as plain text where colours are off.
- A closing line reporting how many snapshots differ and how to accept them.
- Options `mode`, `maxImages`, `maxRows` and `cellAspect`, validated at startup,
  with `OCELLI_MODE` overriding `mode` for a single run.
- A startup check of the private Playwright surface that names what moved when
  an upgrade breaks it, instead of failing part-way through a run.

### Notes

- Requires Node 20.19+ and `@playwright/test` `>=1.62.1 <2`. No runtime
  dependencies.
- Terminal cell widths account for East Asian width, emoji presentation and
  flags; characters that reorder or hide text are stripped from printed paths.

[unreleased]: https://github.com/wazum/playwright-ocelli/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/wazum/playwright-ocelli/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/wazum/playwright-ocelli/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/wazum/playwright-ocelli/releases/tag/v0.1.0
