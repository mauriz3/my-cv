#!/usr/bin/env bash
# Usage: scripts/pdf/check-privacy.sh file.pdf   (exits 1 if anything is found)
f="$1"; fail=0
[ -f "$f" ] || { echo "Missing file $f"; exit 2; }
echo "== Pages / metadata =="; pdfinfo "$f" | rg -i "^(Title|Author|Subject|Keywords|Creator|Producer|Pages|Tagged)"
pages=$(pdfinfo "$f" | awk '/^Pages:/{print $2}'); [ "$pages" -le 2 ] || { echo "FAIL: more than 2 pages"; fail=1; }
meta=$(pdfinfo -meta "$f" 2>/dev/null; strings -n 6 "$f" | rg -i "^/(Author|Title|Subject|Keywords|Creator|Producer)" )
txt=$(pdftotext -layout "$f" -)
all="$meta
$txt
$(strings -n 6 "$f")"
echo "== Private data search =="
echo "$all" | rg -n -i -o "[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}" && { echo "FAIL: email"; fail=1; }
echo "$all" | rg -n -i "mailto:|tel:" && { echo "FAIL: mailto/tel"; fail=1; }
echo "$txt" | rg -n -o "(\+?\d[\d ()./-]{8,}\d)" | rg -v "^[0-9]+:(19|20)[0-9]{2} ?[-–] ?(19|20)[0-9]{2}$" && { echo "REVIEW: possible phone"; fail=1; }
echo "$all" | rg -n -i "system73\.com|/home/|/workspace/|C:\\\\Users|file://" && { echo "FAIL: work path or domain"; fail=1; }
echo "== Links =="; pdftotext -raw "$f" - | rg -o "https?://\S+|linkedin\.com\S*|github\.com\S*|codepen\.io\S*" | sort -u
echo "== Fonts =="; pdffonts "$f"; pdffonts "$f" | awk 'NR>2 && $(NF-4)!="yes"{bad=1} END{exit bad}' || { echo "FAIL: font not embedded"; fail=1; }
echo "== Images with text? =="; pdfimages -list "$f" | tail -n +3 | wc -l
[ $fail -eq 0 ] && echo "OK: no findings" || echo "FINDINGS PRESENT"; exit $fail
