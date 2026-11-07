# my-cv

CV de Maurizio Rendon como app tipo dashboard. Nuxt 4 + Nuxt UI v4 + Tailwind 4 + TypeScript estricto, i18n EN/ES, generada como sitio estático.

Requiere Node 24 (`.nvmrc`).

```bash
npm install
npm run dev        # desarrollo
npm run typecheck  # tipos
npm run test       # tests unitarios (Vitest), incluye validación zod de los datos
npm run generate   # sitio estático en .output/public + hashes CSP
npm run pdf        # regenera public/Resume-Maurizio-Rendon-{en,es}.pdf desde data/ (ver scripts/pdf/README.md)
```

## Estructura

- `app/` páginas, layout, componentes, composables y utilidades (Nuxt 4).
- `data/` contenido del CV: `cv.shared.ts` (fechas, enlaces, imágenes) + `cv.en.ts` / `cv.es.ts` (solo textos) + `getCv(locale)`.
- `lib/` funciones puras con tests (periodos, años, recorrido, microanimaciones, visitas, movimiento, tema, consentimiento).
- `i18n/locales/` textos de la interfaz.
- `scripts/pdf/` generador del CV en PDF (EN/ES): lee `data/cv.*.ts` con `getCv`, así web y PDF comparten el texto (un test lo comprueba).
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

- Página con Chart.js (solo se carga en esa página) y filtro 1 día / 1 semana / 1 mes / **Datos de ejemplo** (radiogroup con flechas, 4 botones de 44 px que caben a 360 px). Cada gráfica tiene tabla alternativa.
- Filtro por defecto (`lib/visitsFilter.ts`, lógica pura con tests): con datos reales (`sample: false`, instantánea de GA4) **1 mes**; si `/api/visits/30d` falla, no cumple el contrato mínimo o solo devuelve el mock (`sample: true`), **Datos de ejemplo**. Si se elige 1 día / 1 semana con la API caída, sale el aviso de error con «Reintentar».
- «Datos de ejemplo» no pide nada a la API: `buildMockReport('30d')` se genera en el navegador y se carga en diferido (chunk propio de ~2 KB, solo al elegir ese filtro).
- Nota bajo el filtro (icono + texto, no solo color): «Datos actualizados hace X h/min» con datos reales (`generatedAt`, `lib/updatedAgo.ts`); «Ejemplo con datos ficticios: no son visitas reales» si se elige el ejemplo habiendo datos reales; «Aún no hay datos reales: se muestra un ejemplo con datos ficticios» si no los hay.
- Una sola fuente de verdad real/ejemplo: el campo `sample` del informe → `visitsNote` (`lib/visitsFilter.ts`) → `useVisitsNote`, que usan la página y la tarjeta «Visitas» del Inicio. La tarjeta dice «Datos actualizados hace X · solo agregados, sin IPs ni identificadores» con datos reales y «Datos de ejemplo (mock) · …» con el mock.
- Contrato: `lib/visitsSchema.ts` (zod, en el servidor). En el cliente, `app/composables/useVisits.ts` pide `/api/visits/{1d,7d,30d}` (mismo origen, CSP `connect-src 'self'`), hace una comprobación mínima sin zod (`isUsableReport`) y **no sabe de dónde salen los datos**. La tarjeta «Visitas» del Inicio usa el informe de 30 días en SVG.
- Con muy pocos datos (p. ej. 15 visitas, series con ceros, un solo país, heatmap casi vacío) las gráficas no se rompen: la línea usa interpolación `monotone` (no baja de 0) y el anillo de dispositivos no pinta bordes con un solo segmento.

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

### Microanimaciones de las tarjetas del Inicio (Tandas F y G)

- Ligadas al scroll y sin bucle: se dibujan al entrar y vuelven atrás al subir. Solo animan `transform`, `opacity` y `stroke-dashoffset`.
- Perfil: su contenido se ve desde la carga (nunca se oculta); con el scroll, eyebrow, titular, tagline y KPI se asientan escalonados (solo `translate`/`scale`) y los contadores suben. El nombre (`h1`, LCP) no se anima.
- Habilidades, Experiencia, Formación y Proyectos (Tanda G) llevan una escena SVG a ancho completo bajo el título (`JourneyScene`, `<figure aria-hidden="true">`, viewBox 280×100): 336×120 en escritorio, 224×80 centrada en móvil (`block-size: clamp(80px, 5.5vw + 58px, 120px)`; 64 px si la ventana mide menos de 640 de alto). No reduce el ancho del título ni tapa texto.
  - Habilidades: radar que se despliega con rebote, 6 barras escalonadas y destello ámbar en Front End (niveles de `skillProfile`).
  - Experiencia: trayectoria de 5 nodos con estela; cada nodo salta al llegarle la línea y el hito final emite una onda ámbar.
  - Formación: 4 escalones que se elevan y un birrete que cae, rebota una vez y balancea la borla.
  - Proyectos: código que se teclea con cursor ámbar fijo (sin parpadeo), flecha «deploy» y 3 bloques que se apilan con check.
  - Geometría, tramos y valores en `lib/journeyScene.ts`: cada parte tiene canales (`x`, `y`, `scale`, `scaleY`, `rotate`, `opacity`, `offset`) que valen su valor neutro en p = 1, así el SVG sin variables ya es el estado final. Colores: `--g-main` (brand), `--g-acc` (`--accent`, ámbar), `--g-track` (guías, #6E7681 / #8C959F) y relleno tintado decorativo (el contraste lo da el borde: main y acc ≥ 4,5:1, guías ≥ 3:1).
  - Primer pintado sin parpadeo: cada canal se lee como `var(--fx-<parte>-<canal>, <valor en p = 0>)` (`sceneVariableReference`), así que con movimiento el HTML prerenderizado ya muestra el estado inicial antes de que el JS escriba la primera variable. Esas reglas solo aplican con `<html data-motion="full">` (lo pone el script inline anterior al pintado): sin JS, con movimiento reducido o en pausa, estado final. Sin scripts nuevos ni cambios de CSP.
- Perfil y Visitas no cambian.
- Lógica pura en `lib/cardMotion.ts` (progreso por tarjeta y valores del Perfil) y `lib/journeyScene.ts` (escenas), con tests, sobre `lib/easing.ts`. `app/composables/useCardMotion.ts` escribe variables CSS `--fx-*` en el mismo rAF del recorrido (`useJourney`, opción `onFrame`).
- Progreso: en el recorrido fijado (escritorio/tablet) sale del tramo del punto (0,6–0,85 del segmento; el Perfil, 0–0,25). En el pin móvil, 0,46–0,62 (el Perfil sigue la entrada del holograma). Sin pin, se calcula por la posición de la tarjeta en pantalla.
- Movimiento reducido o pausa global: estado final estático, sin saltos (sin variables, cada canal vale su valor final). El foco de teclado dentro de una tarjeta también fuerza el estado final.

### Tema claro / oscuro (oscuro por defecto)

- Botón sol/luna de la cabecera (`UColorModeButton` de Nuxt UI, que usa `@nuxtjs/color-mode`). Configuración en `nuxt.config.ts` (`colorMode`: `preference` y `fallback` = `dark`); constantes y lógica pura en `lib/theme.ts`.
- **Decisión:** sin elección guardada, oscuro. `prefers-color-scheme` **no** se consulta: solo una elección explícita con el botón (`localStorage["nuxt-color-mode"]` = `light` | `dark`) cambia el tema, y se mantiene en todas las páginas e idiomas. El valor `system` que guardaba color-mode a visitas antiguas no es una elección: se borra y se vuelve al oscuro.
- Sin parpadeo: el HTML prerenderizado ya sale con `<html class="dark">` y `<meta name="theme-color" content="#0d1117">` (también sin JS). El script inline `THEME_NO_FLASH_SCRIPT` (antes del de color-mode) solo quita `dark` si hay `light` guardado; su hash entra en la CSP con `scripts/build-headers.mjs`. `color-scheme` (barras de scroll y controles nativos) y `theme-color` siguen al tema.
- No afecta a `og-cv.png` ni a los PDF (tienen su propia plantilla).

### Libros que recomiendo

- Sección del Perfil tras el recorrido (`#books`, sin entrada en el menú). Datos en `data/` (`books` en `cv.shared.ts` y textos en `cv.en.ts` / `cv.es.ts`); portadas WebP en `public/books/` con sus medidas reales (un test lo comprueba).
- Enlaces cortos `/en/books` y `/es/libros` para Destacados de LinkedIn (que quita el `#`): pega `https://www.mauriziorendon.com/en/books` (o `/es/libros`). Son una página mínima (`app/pages/books.vue`, rutas traducidas en `nuxt.config.ts` → `i18n.pages`) que responde **200** con la misma vista previa que el Perfil (`og:title`, `og:description`, `og:image`, `twitter:card`; `usePageSeo` con `canonicalPath`: `canonical` y `og:url` al Perfil, sin `hreflang`, sin `noindex`) y salta a `/en/#books` (o `/es/#books`) con `location.replace` (script inline con hash en la CSP vía `scripts/build-headers.mjs`) y `<meta http-equiv="refresh">` sin JS; el enlace visible queda de respaldo. Sin scripts de Nuxt (`routeRules` → `noScripts`) ni `_payload.json`.
- Se prerenderizan como `en/books.html` y `es/libros.html` (hook `prerender:generate`, `lib/booksShortLink.ts`): Netlify sirve `ruta.html` con 200 en `/ruta` y manda `/ruta/` a `/ruta` (301), mientras que `ruta/index.html` haría un 301 a `/ruta/`. No hay reglas en `_redirects`: el 301 anterior con fragmento (`/en/#books`) hacía fallar el Post Inspector de LinkedIn (500), y una regla para la barra final podría hacer bucle (Netlify empareja con o sin ella). Tests: `tests/unit/booksShortLink.spec.ts` y `redirects.spec.ts`. Comprobación: `curl -A LinkedInBot -i https://www.mauriziorendon.com/en/books` → 200 con `og:image`.

### Vista previa al compartir (Open Graph / Twitter)

`usePageSeo` es el único punto: todas las páginas (EN/ES) llevan `og:image` absoluta (`https://www.mauriziorendon.com/og-cv.png`, 1200×630 PNG, `alt` traducido en `seo.imageAlt`), `og:url`/`og:locale` de `useLocaleHead` (misma URL que `canonical` y `hreflang`) y `twitter:card=summary_large_image`. Constantes en `lib/socialMeta.ts`.

La imagen sale de `scripts/og-image.mjs` (azul de los tokens `--color-brand-*` de `main.css`, Inter y Space Grotesk locales, avatar `public/me.webp`; sin datos de contacto). Para regenerarla, con Google Chrome instalado (o `CHROME_PATH=/ruta/al/navegador`):

```sh
npm i --no-save playwright-core && node scripts/og-image.mjs
```

### Imágenes

Ráster en WebP (sin pérdida para capturas, calidad 85 para portadas); siguen en PNG/ICO/JPG solo `og-cv.png` (LinkedIn), `favicon.ico` y `webtele.jpg` (su WebP pesa más). `tests/unit/images.spec.ts` impide imágenes sin usar o ráster nuevos fuera de esas excepciones. Detalle en [docs/imagenes.md](docs/imagenes.md).

## Despliegue

- La CI (`.github/workflows/ci.yml`) ejecuta typecheck, tests, generate y audit:check, más gitleaks.
- Solo un push a master despliega (`deploy-production`, Netlify CLI con `--no-build`). Ese job hace checkout del repo y `npm ci --ignore-scripts` para que Netlify empaquete la Edge Function `/geo` y las funciones de `netlify/functions` (`netlify.toml` → `[functions]`). Después comprueba las cabeceras de producción, que `/geo` responde `{country}` con `no-store` y rechaza POST (405), y que `/api/visits/{1d,7d,30d}` lo sirve la función (`x-visits-source`) con el informe de su rango.
