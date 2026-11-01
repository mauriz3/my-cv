#!/usr/bin/env bash
# Crea en fonts/ las instancias estáticas de Inter (400/500/600, opsz 14) y Space Grotesk (700) que usa el PDF,
# recortadas a latín (básico, Latin-1 y Latin Extended-A) y puntuación general.
# Motivo: Chromium incrusta las fuentes variables como Type 3; las estáticas salen como CID TrueType.
# Requisitos: python3 con fontTools (`pip install fonttools`). Fuentes variables de Google Fonts (SIL OFL 1.1):
#   INTER_SOURCE=…/Inter-VariableFont_opsz,wght.ttf  SPACE_GROTESK_SOURCE=…/SpaceGrotesk-VariableFont_wght.ttf
set -euo pipefail
cd "$(dirname "$0")/fonts"
GOOGLE_FONTS_DIR="${GOOGLE_FONTS_DIR:-/usr/share/fonts/truetype/sand-box/google}"
INTER_SOURCE="${INTER_SOURCE:-$GOOGLE_FONTS_DIR/Inter/Inter-VariableFont_opsz,wght.ttf}"
SPACE_GROTESK_SOURCE="${SPACE_GROTESK_SOURCE:-$GOOGLE_FONTS_DIR/Space Grotesk/SpaceGrotesk-VariableFont_wght.ttf}"
INTER_OPTICAL_SIZE=14   # tamaño óptico adecuado para texto de 8–12 pt
INTER_WEIGHTS=(400 500 600)
SPACE_GROTESK_WEIGHT=700
LATIN_UNICODES="U+0000-017F,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2190-2193,U+2212"

subset() { # $1 = instancia temporal, $2 = salida
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
