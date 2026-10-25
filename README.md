# my-cv

CV de Maurizio Rendon como app tipo dashboard. Nuxt 4 + Nuxt UI v4 + Tailwind 4 + TypeScript estricto, i18n EN/ES, generada como sitio estático.

Requiere Node 24 (`.nvmrc`).

```bash
npm install
npm run dev        # desarrollo
npm run typecheck  # tipos
npm run test       # tests unitarios (Vitest), incluye validación zod de los datos
npm run generate   # sitio estático en .output/public + hashes CSP
```

## Estructura

- `app/` páginas, layout, componentes, composables y utilidades (Nuxt 4).
- `data/` contenido del CV: `cv.shared.ts` (fechas, enlaces, imágenes) + `cv.en.ts` / `cv.es.ts` (solo textos) + `getCv(locale)`.
- `lib/` funciones puras (periodos, años por área).
- `i18n/locales/` textos de la interfaz.
- `public/` estáticos, `_headers` (CSP y cabeceras) y `_redirects`.
- `tests/unit/` Vitest. Netlify ejecuta `npm run test && npm run generate`; si falla un test, no hay deploy.

Sin teléfono, email ni dirección en ningún sitio: contacto solo por LinkedIn, CodePen y GitHub.

## Seguridad

- CSP estricta en `public/_headers`: los scripts inline llevan hash (lo calcula `scripts/build-headers.mjs` tras cada `generate`). No hay dominios externos.
- Excepción consciente: `style-src 'unsafe-inline'`, porque Nuxt UI y Vue generan estilos inline. Solo afecta a estilos, no a scripts.
- Fuera de producción (`CONTEXT` distinto de `production` en Netlify) se añade `X-Robots-Tag: noindex`.
- Las acciones de GitHub se fijan por SHA de commit y Dependabot las actualiza cada semana.
