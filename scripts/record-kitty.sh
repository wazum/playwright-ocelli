#!/bin/sh
# Records the kitty-mode GIF.
#
# This cannot be headless. VHS and agg replay escape sequences into a text
# renderer with no kitty graphics support, so the image would simply be absent.
# A real terminal has to draw it, so a fresh Ghostty instance is driven
# fullscreen and the display is captured.
#
# Because the capture is of the whole display, it writes to a staging path and
# stops. Nothing lands in docs/media until a human has looked at the frames it
# prints. An earlier version recorded the desktop behind a not-yet-fullscreen
# window and reported success.
set -eu

repository=$(cd "$(dirname "$0")/.." && pwd)
capture=/tmp/ocelli-kitty.mov
palette=/tmp/ocelli-palette.png
draft=/tmp/ocelli-kitty-draft.gif
probe=/tmp/ocelli-permission-probe.mov
settle=6
seconds=16

rm -f "$probe"
screencapture -v -V1 -R0,0,80,60 "$probe" >/dev/null 2>&1 || true
if [ ! -s "$probe" ]; then
  echo "Screen Recording permission is not granted to this terminal." >&2
  echo "System Settings > Privacy & Security > Screen Recording, add the app" >&2
  echo "you are running this from, quit it fully, reopen and run again." >&2
  exit 1
fi
rm -f "$probe"

"$repository/scripts/stage-recording.sh"

# Ghostty first. The window must own the screen before anything is recorded.
open -na /Applications/Ghostty.app --args \
  --fullscreen=true \
  --font-size=11 \
  --quit-after-last-window-closed=true \
  -e sh -c "cd /tmp/ocelli && sleep $settle && OCELLI_MODE=kitty npx playwright test --grep price; sleep 8"

sleep "$settle"

rm -f "$capture"
screencapture -v -V"$seconds" -D1 "$capture" || true

if [ ! -s "$capture" ]; then
  echo "capture wrote nothing" >&2
  exit 1
fi

ffmpeg -y -i "$capture" \
  -vf "fps=12,scale=1120:-1:flags=lanczos,palettegen" "$palette" >/dev/null 2>&1
ffmpeg -y -i "$capture" -i "$palette" \
  -lavfi "fps=12,scale=1120:-1:flags=lanczos [x]; [x][1:v] paletteuse" \
  "$draft" >/dev/null 2>&1

for at in 10 50 90; do
  ffmpeg -y -i "$draft" -vf "select=eq(n\,$at)" -vframes 1 \
    "/tmp/ocelli-frame-$at.png" >/dev/null 2>&1 || true
done

echo "draft: $draft"
echo "frames to inspect: /tmp/ocelli-frame-10.png /tmp/ocelli-frame-50.png /tmp/ocelli-frame-90.png"
echo "check they show only the terminal, then move the draft to docs/media/kitty.gif"
