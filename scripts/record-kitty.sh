#!/bin/sh
# Records the kitty-mode GIF.
#
# This cannot be headless. VHS and agg replay escape sequences into a text
# renderer with no kitty graphics support, so the image would simply be absent.
# A real terminal has to draw it, so a fresh Ghostty instance is driven
# fullscreen and the display is captured. Fullscreen is deliberate: it removes
# window-geometry maths and provides the ~70 rows the run needs.
#
# Requires Screen Recording permission for the terminal running this script:
# System Settings > Privacy & Security > Screen Recording. Granted once, then
# relaunch that terminal.
set -eu

repository=$(cd "$(dirname "$0")/.." && pwd)
capture=/tmp/ocelli-kitty.mov
palette=/tmp/ocelli-palette.png
seconds=18

"$repository/scripts/stage-recording.sh"

rm -f "$capture"
screencapture -v -V"$seconds" -D1 "$capture" &
capturing=$!

sleep 1
open -na /Applications/Ghostty.app --args \
  --fullscreen=true \
  --font-size=11 \
  --quit-after-last-window-closed=true \
  -e sh -c 'cd /tmp/ocelli && sleep 2 && OCELLI_MODE=kitty npx playwright test --grep price; sleep 7'

wait "$capturing"

if [ ! -s "$capture" ]; then
  echo "nothing captured - grant Screen Recording permission and run again" >&2
  exit 1
fi

ffmpeg -y -ss 3 -t 12 -i "$capture" \
  -vf "fps=12,scale=1120:-1:flags=lanczos,palettegen" "$palette" >/dev/null 2>&1
ffmpeg -y -ss 3 -t 12 -i "$capture" -i "$palette" \
  -lavfi "fps=12,scale=1120:-1:flags=lanczos [x]; [x][1:v] paletteuse" \
  "$repository/docs/media/kitty.gif" >/dev/null 2>&1

echo "wrote docs/media/kitty.gif from $capture"
