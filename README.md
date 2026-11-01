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
- `server/api/visits/` endpoint de Visitas (se prerenderiza con el mock), `netlify/functions/` las funciones de Visitas (GA4) y `netlify/edge-functions/` la Edge Function `/geo`.
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

- Página con Chart.js (solo se carga en esa página) y filtro 1 día / 1 semana / 1 mes. Cada gráfica tiene tabla alternativa. Bajo el filtro: «Datos actualizados hace X h/min» (sale del `generatedAt` del informe, `lib/updatedAgo.ts`) o «Datos de ejemplo» con el mock.
- Contrato: `lib/visitsSchema.ts` (zod). En el cliente, `app/composables/useVisits.ts` pide `/api/visits/{1d,7d,30d}` (mismo origen, CSP `connect-src 'self'`) y **no sabe de dónde salen los datos**. La tarjeta «Visitas» del Inicio usa el mock en SVG.

#### Datos reales de Google Analytics 4 (instantánea cada 3 h)

```
GA4 Data API ──(cada 3 h)── netlify/functions/visits-snapshot.ts ──► Netlify Blobs (store «visits», clave «snapshot»)
                                                                            │
navegador ── GET /api/visits/:range ── netlify/functions/visits.ts ◄────────┘  (si no hay o no es válida → mock)
```

- `visits-snapshot` (programada, `0 */3 * * *` UTC): pide a GA4 (`runReport`, 7 informes por rango) 1d, 7d y 30d, valida cada informe con zod y guarda los tres juntos. Un rango que falla conserva el anterior; si fallan todos, no escribe.
- `visits` sirve `/api/visits/:range` en Netlify: el informe de la instantánea o, si no hay o no es válido, `buildMockReport`. Responde con `x-visits-source: snapshot | mock`, caché de CDN de 10 min (`Netlify-CDN-Cache-Control`) y el navegador siempre revalida. El JSON del mock sigue prerrenderizado como respaldo estático.
- Código (puro y con tests, sin red): `lib/googleServiceAccount.ts` (JWT RS256 firmado con `node:crypto` → token OAuth; sin `google-auth-library`), `lib/visitsGa4.ts` (periodos, peticiones y mapeo al contrato), `lib/visitsSnapshot.ts` (instantánea y almacén), `lib/visitsSource.ts` (fuentes `snapshot` → `mock`; para datos en vivo bastará añadir una fuente `live` delante) y `lib/visitsBlobStore.ts` / `lib/visitsFileStore.ts` (Netlify Blobs / fichero local).
- Mapeo GA4 → contrato:
  - Visitas = `sessions`; visitantes = `totalUsers`; duración media = `averageSessionDuration`; rebote = `bounceRate`. Cada KPI se compara con el periodo anterior de la misma longitud.
  - Periodos en días completos hasta ayer: 1d = ayer por horas (`dateHour`), frente a anteayer; 7d y 30d = por día (`date`). Hoy no se incluye porque GA4 aún no lo ha procesado. Las fechas son las de la zona horaria de la propiedad.
  - Dispositivos = `deviceCategory` en %; categorías que no están en el contrato (p. ej. «smart tv») se descartan.
  - Países = `countryId`; con menos de 5 visitas o «(not set)» van a «Otros».
  - Fuentes = `sessionDefaultChannelGroup`: Organic Search, Direct y Referral; LinkedIn se reconoce por `sessionSource` (linkedin, lnkd.in); el resto va a «Otros».
  - Páginas = `screenPageViews` por `pagePath` sin prefijo de idioma (`/es/x` y `/en/x` suman juntas), las 6 primeras. **Desviación:** el PDF del CV del mock no sale, porque GA4 cuenta las descargas como evento, no como página vista.
  - Horas = `dayOfWeek` × `hour` en franjas de 3 h, de lunes a domingo.

**Puesta en marcha (una vez):**

1. Google Cloud: crear un proyecto (o usar uno), activar la **Google Analytics Data API**, crear una **cuenta de servicio** sin roles de proyecto y crearle una clave **JSON**.
2. GA4 → Administrar → Gestión de acceso a la propiedad → añadir el email de la cuenta de servicio (`…@….iam.gserviceaccount.com`) con el rol **Lector**. No necesita más.
3. Netlify → Site configuration → Environment variables, con ámbito **Functions** y marcadas como secretas:
   - `GA_PROPERTY_ID`: ID **numérico** de la propiedad (Administrar → Detalles de la propiedad). No es el `G-…` de medición.
   - `GA_SERVICE_ACCOUNT_JSON`: el contenido completo del JSON de la clave.
4. Desplegar (push a master). La primera instantánea llega en la siguiente hora múltiplo de 3 (UTC). Para no esperar: Netlify → Functions → `visits-snapshot` → **Run now**, y revisar sus registros.

Las credenciales solo viven en Netlify: nunca en el repo, el cliente ni los registros (los registros solo dicen qué rangos se actualizaron y qué estado HTTP dio Google).

**Probar en local:**

- Sin `GA_*`: `npm run dev` → mock (lo mismo que el sitio estático).
- Con `GA_*` (clave en un fichero fuera del repo): `GA_PROPERTY_ID=123456789 GA_SERVICE_ACCOUNT_JSON="$(cat ~/ruta/clave.json)" npm run visits:snapshot`. Pide los 3 rangos a GA4 y escribe `.data/visits-snapshot.json` (ignorado por git). Después, `VISITS_SNAPSHOT_FILE=.data/visits-snapshot.json npm run dev` sirve ese fichero. No definas `VISITS_SNAPSHOT_FILE` al hacer `generate`: el JSON estático debe seguir siendo el mock.
- Las funciones de Netlify con Blobs también se pueden probar con `netlify dev` + `netlify functions:invoke visits-snapshot` (Netlify CLI).

**Límites y cuotas:** cada ejecución hace 21 `runReport` (7 por rango, un rango cada vez porque GA4 admite 10 peticiones simultáneas por propiedad). Son 168 al día, muy por debajo de la cuota de una propiedad estándar (200.000 tokens/día y 40.000 por hora; un informe así gasta unos pocos tokens). Una función programada puede durar como máximo 30 s. Netlify Blobs y las funciones entran en el plan de Netlify; aquí solo se guarda un JSON de unos KB y la CDN absorbe casi todas las lecturas.

### Analítica y consentimiento (solo en producción)

- Google Analytics con Consent Mode v2 (`lib/analytics.ts`): todo `denied` por defecto con `wait_for_update` de 500 ms, y la elección se guarda en `localStorage["analytics-consent"]`.
- El aviso solo se muestra en la UE/EEE, Reino Unido y Suiza (lista `CONSENT_BANNER_COUNTRIES` en `lib/consentRegion.ts`). El país lo da la Edge Function `netlify/edge-functions/geo.ts` en `/geo` (`{ "country": "ES" }`, `Cache-Control: no-store`, HSTS, mismo origen; solo GET/HEAD, el resto da 405).
- Con elección guardada, manda esa elección. Sin ella: país de la zona, desconocido o error de `/geo` (también en local) → aviso; fuera de la zona → `analytics_storage` concedido sin aviso y sin guardar nada.
- El aviso enlaza («Más información») a la página de privacidad `/privacy` (fuera del menú; textos en `i18n/locales`, plazos en `lib/privacy.ts`: retención de GA de 14 meses, igual que en Admin → Retención de datos). En el pie están «Preferencias de analítica», que reabre el aviso para cambiar la elección (granted ↔ denied), y «Privacidad».

### Botón de movimiento global

- En la cabecera de todas las páginas, entre los enlaces y ES/EN (`MotionToggle`). Escritorio: icono + texto; tablet y móvil: icono de 44 px con tooltip. `aria-pressed="true"` = movimiento reducido.
- Estado en `localStorage["motion"]` (`full` | `reduced`) o, si no hay, `prefers-reduced-motion`. Un script inline lo aplica en `<html data-motion>` antes de pintar (`lib/motion.ts`).
- El CSS solo anima con `data-motion="full"`. En reducido, las gráficas usan `animation: false` y, si se pausa a mitad, saltan al estado final.
- `MOTION_TOGGLE_TEXT_MODE` decide el texto de escritorio: `fixed` (actual, siempre «Reducir movimiento») o `by-state`.

### Libros que recomiendo

- Sección del Perfil tras el recorrido (`#books`, sin entrada en el menú). Datos en `data/` (`books` en `cv.shared.ts` y textos en `cv.en.ts` / `cv.es.ts`); portadas optimizadas en `public/books/` con sus medidas reales (un test lo comprueba).

### Vista previa al compartir (Open Graph / Twitter)

`usePageSeo` es el único punto: todas las páginas (EN/ES) llevan `og:image` absoluta (`https://www.mauriziorendon.com/og-cv.png`, 1200×630 PNG, `alt` traducido en `seo.imageAlt`), `og:url`/`og:locale` de `useLocaleHead` (misma URL que `canonical` y `hreflang`) y `twitter:card=summary_large_image`. Constantes en `lib/socialMeta.ts`.

La imagen sale de `scripts/og-image.mjs` (azul de los tokens `--color-brand-*` de `main.css`, Inter y Space Grotesk locales, avatar `public/me.png`; sin datos de contacto). Para regenerarla, con Google Chrome instalado (o `CHROME_PATH=/ruta/al/navegador`):

```sh
npm i --no-save playwright-core && node scripts/og-image.mjs
```

## Despliegue

- La CI (`.github/workflows/ci.yml`) ejecuta typecheck, tests, generate y audit:check, más gitleaks.
- Solo un push a master despliega (`deploy-production`, Netlify CLI con `--no-build`). Ese job hace checkout del repo y `npm ci --ignore-scripts` para que Netlify empaquete la Edge Function `/geo` y las funciones de `netlify/functions` (`netlify.toml` → `[functions]`). Después comprueba las cabeceras de producción, que `/geo` responde `{country}` con `no-store` y rechaza POST (405), y que `/api/visits/{1d,7d,30d}` lo sirve la función (`x-visits-source`) con el informe de su rango.
