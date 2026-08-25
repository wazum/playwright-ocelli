#!/bin/sh
# Stages the demo at /tmp/ocelli so no local directory name appears on screen.
# Playwright prints absolute paths in stack traces; recording from the working
# copy would put them in the GIF.
set -eu

repository=$(cd "$(dirname "$0")/.." && pwd)
stage=/tmp/ocelli

rm -rf "$stage"
mkdir -p "$stage"

rsync -a --exclude test-results --exclude playwright-report \
  "$repository/src" "$repository/examples" "$repository/package.json" "$stage/"
cp "$repository/docs/media/record.config.ts" "$stage/playwright.config.ts"
ln -s "$repository/node_modules" "$stage/node_modules"

cd "$stage" && BASELINE=1 npx playwright test --update-snapshots >/dev/null 2>&1

echo "staged at $stage"
