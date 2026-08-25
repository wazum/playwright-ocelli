# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[unreleased]: https://github.com/wazum/playwright-ocelli/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/wazum/playwright-ocelli/releases/tag/v0.1.0
