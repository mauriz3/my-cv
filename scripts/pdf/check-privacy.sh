#!/usr/bin/env bash
# Uso: scripts/pdf/check-privacy.sh archivo.pdf   (sale con código 1 si encuentra algo)
f="$1"; fail=0
[ -f "$f" ] || { echo "No existe $f"; exit 2; }
echo "== Páginas / metadatos =="; pdfinfo "$f" | rg -i "^(Title|Author|Subject|Keywords|Creator|Producer|Pages|Tagged)"
pages=$(pdfinfo "$f" | awk '/^Pages:/{print $2}'); [ "$pages" -le 2 ] || { echo "FALLO: más de 2 páginas"; fail=1; }
meta=$(pdfinfo -meta "$f" 2>/dev/null; strings -n 6 "$f" | rg -i "^/(Author|Title|Subject|Keywords|Creator|Producer)" )
txt=$(pdftotext -layout "$f" -)
all="$meta
$txt
$(strings -n 6 "$f")"
echo "== Búsqueda de datos privados =="
echo "$all" | rg -n -i -o "[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}" && { echo "FALLO: correo"; fail=1; }
echo "$all" | rg -n -i "mailto:|tel:" && { echo "FALLO: mailto/tel"; fail=1; }
echo "$txt" | rg -n -o "(\+?\d[\d ()./-]{8,}\d)" | rg -v "^[0-9]+:(19|20)[0-9]{2} ?[-–] ?(19|20)[0-9]{2}$" && { echo "REVISAR: posible teléfono"; fail=1; }
echo "$all" | rg -n -i "system73\.com|/home/|/workspace/|C:\\\\Users|file://" && { echo "FALLO: ruta o dominio del trabajo"; fail=1; }
echo "== Enlaces =="; pdftotext -raw "$f" - | rg -o "https?://\S+|linkedin\.com\S*|github\.com\S*|codepen\.io\S*" | sort -u
echo "== Fuentes =="; pdffonts "$f"; pdffonts "$f" | awk 'NR>2 && $(NF-4)!="yes"{bad=1} END{exit bad}' || { echo "FALLO: fuente no incrustada"; fail=1; }
echo "== Imágenes con texto? =="; pdfimages -list "$f" | tail -n +3 | wc -l
[ $fail -eq 0 ] && echo "OK: sin hallazgos" || echo "HAY HALLAZGOS"; exit $fail
