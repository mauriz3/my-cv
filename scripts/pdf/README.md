# CV en PDF (EN / ES)

Genera `public/Resume-Maurizio-Rendon-en.pdf` y `-es.pdf` (A4, exactamente 2 páginas) según el «Handoff – CV PDF» de diseño.

**Fuente única:** el texto sale de `data/cv.*.ts` vía `getCv(locale)`. Para cambiar el summary, un puesto o una viñeta, edita `data/` y regenera; no hay texto del CV duplicado aquí. `tests/unit/pdfContent.spec.ts` comprueba que web y PDF comparten summary, viñetas de Octane11, puestos, formación, proyectos y skills.

- `content.ts`: construye el contenido del PDF desde los datos. Solo añade lo propio del PDF, con constantes con nombre: títulos de sección y pie, perfil = `summary` + `motivation`, orden de enlaces y de filas de Skills (Back End primero), alias ATS (`React (ReactJS)`, `Chart.js (ChartJS)`), etiqueta «DevOps (2016–2018)» calculada del periodo, salto de hoja antes de Open Canarias y ubicación corta de System73 («Tenerife»).
- `template.ts`: HTML semántico de una columna (h1/h2/h3, listas) y pie «Maurizio Rendon · CV · Page X of Y» con `@page`.
- `cv-print.css`: estilos de impresión (teal `#0F766E` y ámbar `#B45309` sobre grafito; Inter + Space Grotesk locales).
- `generate.ts`: Chromium (Google Chrome vía `playwright-core`) → PDF etiquetado; `pdf-lib` limpia los metadatos y comprueba las 2 páginas.
- `check-privacy.sh`: falla si el PDF tiene correo, teléfono, `mailto:`/`tel:`, rutas locales, fuentes sin incrustar o más de 2 páginas.
- `fonts/`: instancias estáticas recortadas a latín de Inter 400/500/600 y Space Grotesk 700 (SIL OFL 1.1, licencias en `fonts/OFL-*.txt`). Se recrean con `make-static-fonts.sh` (python3 + fontTools; las variables saldrían como Type 3).

## Regenerar

```sh
npm run pdf   # genera los dos PDF y pasa check-privacy.sh a cada uno
```

Requisitos: Google Chrome en `/usr/bin/google-chrome` (o `CHROME_PATH=/ruta/al/navegador`) y `poppler-utils` + `ripgrep` para la comprobación de privacidad. No corre en CI: los PDF se versionan en `public/`.

Privacidad: solo enlaces de LinkedIn, GitHub y CodePen. Nunca correo, teléfono ni dirección.
