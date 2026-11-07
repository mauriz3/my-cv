# Normas para agentes de IA

## Flujo y documentación
- Nunca fusionar ni desplegar en master sin OK explícito de Maurizio. Trabajar en ramas con PR; sin force push.
- Desplegar únicamente por GitHub Actions; no publicar desde CLI local ni activar builds automáticos de Netlify.
- Actualizar README y `docs/` (incluido [ADR](docs/adr.md)) cuando la PR lo requiera. Registrar decisiones nuevas.
- README breve, sin nombres internos como «tandas». Coordinar cambios de documentación con otras ramas.
- Commits con el email noreply de GitHub; no usar correo personal.

## Calidad y comandos
- Usar Node 24 (`.nvmrc`), npm y el lockfile; instalar con `npm ci`.
- CI obligatoria: typecheck, tests, cobertura ≥80 % en TS, axe y Lighthouse con umbrales, `npm run audit:check`.
- Umbrales y configuración (PR #55): [calidad](docs/calidad.md). Axe falla con serious/critical; Lighthouse ≥0,85 rendimiento, ≥0,95 accesibilidad, ≥0,90 buenas prácticas y ≥0,95 SEO.
- Comandos: `npm run dev`, `npm run typecheck`, `npm run test`, `npm run coverage`, `npm run generate`, `npm run test:a11y`, `npm run lighthouse`, `npm run audit:check`, `npm run pdf`.
- `generate` produce `.output/public` y hashes CSP; no omitir el posprocesado.

## Código y arquitectura
- Vue 3/Nuxt 4: Composition API, composables, `<script setup lang="ts">` y TypeScript estricto, incluido `noUncheckedIndexedAccess`.
- Seguir [arquitectura](docs/arquitectura.md), [tipos](docs/tipos.md) y [decisiones](docs/adr.md): vistas presentan, composables coordinan, lógica pura se prueba en `lib/`; aislar adaptadores con E/S.
- KISS, DRY, YAGNI y SRP; nombres con intención y constantes con nombre, sin números mágicos.
- Reutilizar tipos con `Pick`, `Omit`, `extends`, genéricos, `satisfies` y derivados `typeof`/`keyof` cuando simplifique, no por obligación ornamental.
- Inferir de esquemas Zod con `z.infer`, `z.input` o `z.output`; no duplicar contratos a mano. Validar datos externos en sus límites; coerción explícita cuando proceda.
- Datos del CV en `data/`: hechos compartidos y textos EN/ES; interfaz en `i18n/locales/`. Traducir todo texto visible y accesible, también errores y metadatos.
- Mantener API de Visitas independiente de su fuente, snapshot validado y respaldo de ejemplo claramente identificado. No exponer credenciales GA al navegador.

## Interfaz y accesibilidad
- Comprobar contraste, teclado y accesibilidad en dark y light; dark por defecto, sin parpadeo.
- Respetar `prefers-reduced-motion` y pausa global; no tocar animaciones de Profile y Visitas sin pedirlo.
- Reutilizar tokens de tema; gráficas con alternativa tabular y sin depender solo del color.
- Conservar rutas EN/ES y enlaces cortos de libros con respuesta 200 y Open Graph.

## Contenido del CV
- Usar «10+ años»; AWS solo en histórico de System73 (2016–2018), no como habilidad actual.
- Mencionar IA, automatización, MCP y asistentes de chat; servidores y serverless/JAMstack, no solo serverless.
- No presentarlo como ingeniero de datos: dashboards y gráficos no equivalen a esa especialidad. Nada de búsqueda de empleo.
- Mantener web, PDFs y LinkedIn alineados. Regenerar PDFs desde `data/`, no mantener copias de contenido independientes.

## Privacidad y seguridad
- Rechazar tan visible como aceptar; no afirmar que las cookies analíticas son necesarias. Mantener consentimiento inicial denied y respaldo prudente ante país desconocido.
- Nunca secretos en repo, build, cliente, documentación ni registros. Sin teléfono, email ni dirección en web/PDFs.
- No confundir agregados públicos con anonimato de la medición GA; denied no garantiza ausencia de solicitudes a Google.
- Ningún script inline sin hash; nada de `unsafe-inline`/`unsafe-eval` en `script-src`. La excepción de estilos no autoriza scripts.
- Acciones fijadas por SHA, permisos mínimos y gitleaks. Auditar dependencias; cualquier excepción necesita justificación y caducidad.
- No quitar `noindex` de builds no productivos ni pasar credenciales/datos reales al respaldo estático.

## Diagramas
- Actualizar los diagramas afectados y renderizar cada bloque Mermaid modificado con `mmdc`, instalado fuera del repo.
