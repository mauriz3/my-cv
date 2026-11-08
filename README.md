# my-cv

CV de Maurizio Rendon como app tipo dashboard: [www.mauriziorendon.com](https://www.mauriziorendon.com). Sitio estático en inglés y español con perfil, habilidades, experiencia, formación, proyectos y visitas (Google Analytics 4).

## Stack

Nuxt 4 (`nuxt generate`) · Nuxt UI v4 · Tailwind 4 · TypeScript estricto · `@nuxtjs/i18n` (EN/ES) · zod · Chart.js · Vitest, Playwright + axe y Lighthouse CI · Netlify (estáticos, funciones, Blobs y una Edge Function).

## Arrancar

Requiere Node 24 (`.nvmrc`).

```bash
npm install
npm run dev
```

## Scripts

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Desarrollo |
| `npm run typecheck` | Tipos |
| `npm run test` | Tests de Vitest (`tests/unit/` y `tests/nuxt/`), incluida la validación zod de los datos |
| `npm run coverage` | Tests con cobertura (mínimo 80 %; informe en `coverage/index.html`) |
| `npm run generate` | Sitio estático en `.output/public` + cabeceras y hashes CSP |
| `npm run test:a11y` | axe sobre el sitio generado (requiere `generate` y Google Chrome) |
| `npm run lighthouse` | Lighthouse sobre el sitio generado (requiere `generate` y Google Chrome) |
| `npm run lighthouse:consent` | Lo mismo con el aviso de analítica (visita desde la UE; build de producción) |
| `npm run audit:check` | `npm audit` con excepciones justificadas |
| `npm run pdf` | Regenera los PDF del CV desde `data/` ([scripts/pdf/README.md](scripts/pdf/README.md)) |
| `npm run visits:snapshot` | Instantánea local de GA4 ([docs/ga4.md](docs/ga4.md)) |

## Estructura

- `app/` páginas, layouts, componentes, composables y utilidades.
- `data/` contenido del CV (`cv.shared.ts` + textos en `cv.en.ts` / `cv.es.ts`); lo comparten la web y el PDF.
- `lib/` lógica pura con tests.
- `i18n/locales/` textos de la interfaz.
- `server/`, `netlify/functions/` y `netlify/edge-functions/`: API de Visitas y `/geo`.
- `public/` estáticos, `_headers` (CSP) y `_redirects`.
- `scripts/` generación de cabeceras, PDF, imagen Open Graph, auditorías y servidor local para la CI.
- `tests/` Vitest (`unit/`, `nuxt/`) y axe (`a11y/`).

## Imágenes

Ráster en WebP (sin pérdida para capturas, calidad 85 para portadas); siguen en PNG/ICO/JPG solo `og-cv.png` (LinkedIn), `favicon.ico` y `webtele.jpg` (su WebP pesa más). `tests/unit/images.spec.ts` impide imágenes sin usar o ráster nuevos fuera de esas excepciones. Detalle: [docs/imagenes.md](docs/imagenes.md).

## CI y calidad

Cada PR y cada push a master pasan por `.github/workflows/ci.yml`: typecheck, tests con cobertura (bloquea por debajo del 80 %), generate, `audit:check`, gitleaks, axe (falla con violaciones serious/critical) y Lighthouse (umbrales por categoría). Los informes quedan como artefactos de la ejecución en Actions. Detalle: [docs/calidad.md](docs/calidad.md). Seguridad (CSP, cabeceras, dependencias): [docs/seguridad.md](docs/seguridad.md).

## Despliegue

Solo un push a master despliega en Netlify (job `deploy-production`, tras pasar toda la CI) y después comprueba producción. Detalle: [docs/despliegue.md](docs/despliegue.md).

## Documentación

- [Funcionalidades](docs/funcionalidades.md): Visitas, analítica y consentimiento, animaciones opt-in, microanimaciones, tema, libros y vista previa al compartir.
- [Visitas con datos de GA4](docs/ga4.md): instantánea, puesta en marcha y pruebas en local.
- [Imágenes](docs/imagenes.md): formatos, excepciones y cómo añadir una imagen.
- [Calidad](docs/calidad.md) · [Seguridad](docs/seguridad.md) · [Despliegue](docs/despliegue.md).
- [Diagramas de arquitectura, tipos y flujos](docs/README.md) · [Decisiones (ADR)](docs/adr.md) · [Normas para agentes](AGENTS.md).
