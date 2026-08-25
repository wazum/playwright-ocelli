#!/bin/sh
# Records the kitty-mode still shown in the README.
#
# A still, not an animation: the run completes in under a second, so every
# frame after the draw is the same picture.
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

frames=""

for at in 4 6 8 10 12; do
  frame="/tmp/ocelli-frame-${at}s.png"

  ffmpeg -y -ss "$at" -i "$capture" -vframes 1 "$frame" >/dev/null 2>&1 || true

  [ -s "$frame" ] && frames="$frames $frame"
done

if [ -z "$frames" ]; then
  echo "no frame could be extracted from $capture" >&2
  exit 1
fi

echo "capture: $capture"
echo "frames to inspect:$frames"
echo "check one shows only the terminal and nothing private, crop it to the"
echo "terminal window, then save it as docs/media/kitty.png"
