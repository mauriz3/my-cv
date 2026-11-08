#!/usr/bin/env bash
# Creates static Inter (400/500/600, opsz 14) and Space Grotesk (700) instances in fonts/ for the PDF,
# subset to Latin (basic, Latin-1, Latin Extended-A) and general punctuation.
# Reason: Chromium embeds variable fonts as Type 3; static fonts embed as CID TrueType.
# Requirements: python3 with fontTools (`pip install fonttools`). Google Fonts variable sources (SIL OFL 1.1):
#   INTER_SOURCE=…/Inter-VariableFont_opsz,wght.ttf  SPACE_GROTESK_SOURCE=…/SpaceGrotesk-VariableFont_wght.ttf
set -euo pipefail
cd "$(dirname "$0")/fonts"
GOOGLE_FONTS_DIR="${GOOGLE_FONTS_DIR:-/usr/share/fonts/truetype/sand-box/google}"
INTER_SOURCE="${INTER_SOURCE:-$GOOGLE_FONTS_DIR/Inter/Inter-VariableFont_opsz,wght.ttf}"
SPACE_GROTESK_SOURCE="${SPACE_GROTESK_SOURCE:-$GOOGLE_FONTS_DIR/Space Grotesk/SpaceGrotesk-VariableFont_wght.ttf}"
INTER_OPTICAL_SIZE=14   # optical size suited for 8–12 pt text
INTER_WEIGHTS=(400 500 600)
SPACE_GROTESK_WEIGHT=700
LATIN_UNICODES="U+0000-017F,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2190-2193,U+2212"

subset() { # $1 = temp instance, $2 = output
  python3 -m fontTools.subset "$1" --unicodes="$LATIN_UNICODES" --layout-features='*' --output-file="$2"
  rm "$1"
}

for WEIGHT in "${INTER_WEIGHTS[@]}"; do
  python3 -m fontTools.varLib.instancer -q --update-name-table "$INTER_SOURCE" \
    wght=$WEIGHT opsz=$INTER_OPTICAL_SIZE -o "tmp-Inter-$WEIGHT.ttf"
  subset "tmp-Inter-$WEIGHT.ttf" "Inter-$WEIGHT.ttf"
done
python3 -m fontTools.varLib.instancer -q --update-name-table "$SPACE_GROTESK_SOURCE" \
  wght=$SPACE_GROTESK_WEIGHT -o "tmp-SpaceGrotesk-$SPACE_GROTESK_WEIGHT.ttf"
subset "tmp-SpaceGrotesk-$SPACE_GROTESK_WEIGHT.ttf" "SpaceGrotesk-$SPACE_GROTESK_WEIGHT.ttf"
