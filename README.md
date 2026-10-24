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
