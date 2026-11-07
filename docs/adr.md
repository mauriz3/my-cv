# Decisiones de arquitectura (ADR)

Un ADR registra contexto, decisión y consecuencias; se actualiza en cada PR que tome una decisión nueva.
Fechas del primer commit/PR verificable (Atlantic/Canary); base: `origin/master` en `7edcb9f` y PRs pendientes.

## ADR-001 · Nuxt 4 estático en Netlify
**2026-10-24 · Aceptada** · `be08b7f`, `11391be`.
- **Contexto:** Nuxt 2/Vuetify acumulaba deuda.
- **Decisión:** Rehacer con Nuxt 4, Vue 3, Nuxt UI 4, Tailwind 4 y TS estricto; generar estáticos en Netlify.
- **Consecuencias:** Sin servidor Nuxt permanente; conservar contenido, no deuda heredada.

## ADR-002 · Contenido tipado y fuente única
**2026-10-24 · Aceptada** · `be08b7f`, `0dc7f15`.
- **Contexto:** Textos incrustados en vistas.
- **Decisión:** Centralizar datos TS y esquemas Zod; separar hechos y textos EN/ES; generar PDFs desde ellos.
- **Consecuencias:** Web/PDF comparten contenido; validación en tests.

## ADR-003 · Publicar solo desde GitHub Actions
**2026-10-25 · Aceptada** · `c674d67`, `0324d77`.
- **Contexto:** Evitar publicaciones paralelas.
- **Decisión:** Tras verificaciones, publicar el artefacto con Netlify CLI `--no-build`, solo por push a master.
- **Consecuencias:** No desplegar develop; auto-build de Netlify desactivado es requisito externo no verificado.

## ADR-004 · CSP con hashes tras generar
**2026-10-24 · Aceptada** · `be08b7f`, `95d753d`.
- **Contexto:** Nuxt necesita scripts inline.
- **Decisión:** Calcular SHA-256 del HTML generado; prohibir `unsafe-inline`/`unsafe-eval` en `script-src`.
- **Consecuencias:** Regenerar hashes; excepción documentada únicamente para `style-src 'unsafe-inline'`.

## ADR-005 · Cadena de suministro revisable
**2026-10-25 · Aceptada** · `83341e2`, `c706d1a`.
- **Contexto:** Dependencias y acciones ejecutan código.
- **Decisión:** Acciones fijadas por SHA, gitleaks y Dependabot semanal sin auto-merge; token de lectura.
- **Consecuencias:** Actualizaciones mediante PR; secretos y auditoría bloquean el despliegue.

## ADR-006 · Visitas mediante instantáneas
**2026-11-01 · Aceptada** · `500ebd0`, `31baafb` ([PR #42](https://github.com/mauriz3/my-cv/pull/42)).
- **Contexto:** Evitar consultas GA4 por visitante.
- **Decisión:** Función programada cada tres horas → GA4 → snapshot validado en Blobs → `/api/visits`; respaldo ficticio.
- **Consecuencias:** Solo agregados públicos; indicar real/ejemplo; credenciales exclusivamente servidor.

## ADR-007 · Zod sin JIT
**2026-11-07 · Propuesta (PR pendiente)** · [PR #55](https://github.com/mauriz3/my-cv/pull/55).
- **Contexto:** La prueba JIT viola CSP.
- **Decisión:** Centralizar Zod con `jitless: true`.
- **Consecuencias:** No relajar CSP; todavía no está en master.

## ADR-008 · Consentimiento según país
**2026-10-31 · Aceptada** · `bc57e89`, `c706d1a`.
- **Contexto:** Analítica con consentimiento regional.
- **Decisión:** Consent Mode v2 inicialmente denied; Edge `/geo` determina aviso UE/EEE/UK/Suiza, también ante país desconocido/error.
- **Consecuencias:** Fuera se concede analítica sin aviso; elección previa prevalece; denied no garantiza ausencia de solicitudes Google.

## ADR-009 · Retención declarada de 14 meses
**2026-10-31 · Aceptada** · `95d753d`.
- **Contexto:** Informar plazos de analítica.
- **Decisión:** Declarar 14 meses para datos usuario/evento en `lib/privacy.ts`.
- **Consecuencias:** Debe coincidir con GA Admin; ajuste externo no verificado. No equivale a duración de cookies.

## ADR-010 · Libros: HTML 200 con Open Graph
**2026-11-01 · Aceptada** · `4830a57` ([PR #48](https://github.com/mauriz3/my-cv/pull/48)).
- **Contexto:** El 301 fallaba en LinkedIn.
- **Decisión:** `/en/books` y `/es/libros` responden 200 con OG; salto posterior al ancla.
- **Consecuencias:** Sustituye al 301 de `d4d017c`; HTML mínimo sin hidratación Nuxt.

## ADR-011 · Oscuro sin parpadeo
**2026-11-01 · Aceptada** · `d3a1bf9`.
- **Contexto:** Tema inicial coherente.
- **Decisión:** HTML oscuro y script previo al pintado; respetar elección explícita, no preferencia del sistema.
- **Consecuencias:** Persistencia local; script incluido en CSP.

## ADR-012 · Movimiento ligado al scroll
**2026-10-31 · Aceptada** · `e81bd81`, `b9cb7f7`.
- **Contexto:** Recorrido visual accesible.
- **Decisión:** Progreso por scroll, lógica pura y composables; respetar reduced-motion y pausa global.
- **Consecuencias:** Alternativa estática; contenido accesible sin animación.

## ADR-013 · Calidad ampliada en CI
**2026-11-07 · Propuesta (PR pendiente)** · [PR #55](https://github.com/mauriz3/my-cv/pull/55).
- **Contexto:** Ampliar typecheck, tests y audit.
- **Decisión:** axe sin serious/critical; Lighthouse ≥0,85/0,95/0,90/0,95 (rendimiento/a11y/prácticas/SEO); objetivo cobertura TS ≥80 %.
- **Consecuencias:** PR #55 solo informa cobertura, sin umbral: requisito del 80 % aún incumplido.

## ADR-014 · Tipos Node alineados
**2026-11-05 · Aceptada** · `f4e21ed` ([PR #52](https://github.com/mauriz3/my-cv/pull/52)).
- **Contexto:** Runtime Node 24.
- **Decisión:** Dependabot ignora mayores de `@types/node`.
- **Consecuencias:** Revisar manualmente al cambiar el runtime.
