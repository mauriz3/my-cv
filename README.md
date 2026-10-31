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
- `lib/` funciones puras con tests (periodos, años, recorrido, visitas, movimiento, consentimiento).
- `i18n/locales/` textos de la interfaz.
- `public/` estáticos, `_headers` (CSP y cabeceras) y `_redirects`.
- `server/api/visits/` endpoint de Visitas (se prerenderiza) y `netlify/edge-functions/` la Edge Function `/geo`.
- `tests/unit/` Vitest. Netlify ejecuta `npm run test && npm run generate`; si falla un test, no hay deploy.

Sin teléfono, email ni dirección en ningún sitio: contacto solo por LinkedIn, CodePen y GitHub.

## Seguridad

- CSP estricta en `public/_headers`: los scripts inline llevan hash (lo calcula `scripts/build-headers.mjs` tras cada `generate`). Solo el build de producción añade Google Analytics (`ANALYTICS_CSP_SOURCES` en `lib/analytics.ts`): `script-src` admite únicamente `https://www.googletagmanager.com` (gtag.js); `connect-src` e `img-src`, los orígenes de medición de Google.
- Excepción consciente: `style-src 'unsafe-inline'`, porque Nuxt UI y Vue generan estilos inline. Solo afecta a estilos, no a scripts.
- Fuera de producción (`CONTEXT` distinto de `production` en Netlify) se añade `X-Robots-Tag: noindex`.
- Los assets con hash de `/_nuxt/` se sirven con caché de un año e `immutable`.
- Las acciones de GitHub se fijan por SHA de commit. Dependabot (`.github/dependabot.yml`) revisa npm y github-actions cada semana contra la rama por defecto (master): minor/patch agrupadas, pocas PRs abiertas, commits `chore(deps)` y sin auto-merge.
- `npm run audit:check` (CI) falla ante vulnerabilidades high/critical salvo las aceptadas y justificadas en `scripts/audit.mjs`.

## Funcionalidades

### Visitas (`/visits`)

- Página con Chart.js (solo se carga en esa página) y filtro 1 día / 1 semana / 1 mes. Cada gráfica tiene tabla alternativa.
- Datos **mock** desde un endpoint propio: `server/api/visits/[range].get.ts` sirve `/api/visits/{1d,7d,30d}` y Nitro lo prerenderiza a JSON estático del mismo origen (CSP `connect-src 'self'`). El informe se valida con zod (`lib/visitsSchema.ts`).
- En el cliente, `app/composables/useVisits.ts` es el **único punto de cambio**; la tarjeta «Visitas» del Inicio reutiliza los mismos datos en SVG.
- **Pendiente: GA4 real** (no implementado). Plan: en esa ruta, cambiar `buildMockReport(range)` por `runReport` de la GA4 Data API con la credencial solo en variables de entorno del servidor de Netlify (más caché y límite de peticiones), quitar esas rutas de `nitro.prerender.routes` y desplegarlas como función (preset Netlify de Nitro). El cliente no cambia. Nunca credenciales en el cliente ni en el repo.

### Analítica y consentimiento (solo en producción)

- Google Analytics con Consent Mode v2 (`lib/analytics.ts`): todo `denied` por defecto con `wait_for_update` de 500 ms, y la elección se guarda en `localStorage["analytics-consent"]`.
- El aviso solo se muestra en la UE/EEE, Reino Unido y Suiza (lista `CONSENT_BANNER_COUNTRIES` en `lib/consentRegion.ts`). El país lo da la Edge Function `netlify/edge-functions/geo.ts` en `/geo` (`{ "country": "ES" }`, `Cache-Control: no-store`, HSTS, mismo origen; solo GET/HEAD, el resto da 405).
- Con elección guardada, manda esa elección. Sin ella: país de la zona, desconocido o error de `/geo` (también en local) → aviso; fuera de la zona → `analytics_storage` concedido sin aviso y sin guardar nada.
- El aviso enlaza («Más información») a la página de privacidad `/privacy` (fuera del menú; textos en `i18n/locales`, plazos en `lib/privacy.ts`). En el pie están «Preferencias de analítica», que reabre el aviso para cambiar la elección (granted ↔ denied), y «Privacidad».

### Botón de movimiento global

- En la cabecera de todas las páginas, entre los enlaces y ES/EN (`MotionToggle`). Escritorio: icono + texto; tablet y móvil: icono de 44 px con tooltip. `aria-pressed="true"` = movimiento reducido.
- Estado en `localStorage["motion"]` (`full` | `reduced`) o, si no hay, `prefers-reduced-motion`. Un script inline lo aplica en `<html data-motion>` antes de pintar (`lib/motion.ts`).
- El CSS solo anima con `data-motion="full"`. En reducido, las gráficas usan `animation: false` y, si se pausa a mitad, saltan al estado final.
- `MOTION_TOGGLE_TEXT_MODE` decide el texto de escritorio: `fixed` (actual, siempre «Reducir movimiento») o `by-state`.

### Libros que recomiendo

- Sección del Perfil tras el recorrido (`#books`, sin entrada en el menú). Datos en `data/` (`books` en `cv.shared.ts` y textos en `cv.en.ts` / `cv.es.ts`); portadas optimizadas en `public/books/` con sus medidas reales (un test lo comprueba).

## Despliegue

- La CI (`.github/workflows/ci.yml`) ejecuta typecheck, tests, generate y audit:check, más gitleaks.
- Solo un push a master despliega (`deploy-production`, Netlify CLI con `--no-build`). Ese job hace checkout del repo para que Netlify empaquete la Edge Function `/geo`. Después comprueba las cabeceras de producción y que `/geo` responde `{country}` con `no-store` y rechaza POST (405).
