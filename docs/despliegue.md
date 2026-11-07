# Despliegue

- La CI (`.github/workflows/ci.yml`) ejecuta typecheck, tests con cobertura, generate y audit:check, más gitleaks, axe y Lighthouse (`deploy-production` espera a todos).
- Solo un push a master despliega (`deploy-production`, Netlify CLI con `--no-build`). Ese job hace checkout del repo y `npm ci --ignore-scripts` para que Netlify empaquete la Edge Function `/geo` y las funciones de `netlify/functions` (`netlify.toml` → `[functions]`). Después comprueba las cabeceras de producción, que `/geo` responde `{country}` con `no-store` y rechaza POST (405), que `/api/visits/{1d,7d,30d}` lo sirve la función (`x-visits-source`) con el informe de su rango, y que `/en/books` y `/es/libros` responden 200 con `og:image`.
- Netlify, si construye él (`netlify.toml`), ejecuta `npm run test && npm run generate`: si falla un test, no hay deploy. La compilación automática de Netlify está desactivada (confirmado por Maurizio, 2026-11-07), así que en la práctica solo publica GitHub Actions.
- El environment `production` de GitHub permite exigir aprobación manual (Settings → Environments) sin tocar el workflow.

## Flujo de la CI y el despliegue

```mermaid
flowchart TD
  Evento[Push a master o pull_request] --> Contexto{Push a master}
  Contexto -->|Sí| Produccion[CONTEXT production]
  Contexto -->|No| CIContext[CONTEXT ci]
  Produccion --> Verify
  CIContext --> Verify
  Evento --> Secrets
  subgraph Verify[Job verify]
    Install[Checkout, Node según .nvmrc y npm ci] --> Typecheck[npm run typecheck]
    Typecheck --> Coverage[npm run coverage, umbral 80 %]
    Coverage --> Generate[npm run generate]
    Generate --> Audit[npm run audit:check]
    Audit --> Artifact[Artefacto site de .output/public]
  end
  subgraph Secrets[Job secrets]
    History[Checkout con historial completo] --> Gitleaks[gitleaks-action]
  end
  Artifact --> A11y[Job a11y: axe sobre el artefacto]
  Artifact --> Lighthouse[Job lighthouse: lhci sobre el artefacto]
  A11y --> Gate{Los cuatro jobs pasan y es push a master}
  Lighthouse --> Gate
  Artifact --> Gate
  Gitleaks --> Gate
  Gate -->|No| Fin[Sin deploy-production]
  Gate -->|Sí| Deploy
  subgraph Deploy[Job deploy-production, environment production]
    Code[Checkout, Node y npm ci sin scripts] --> Download[Descargar el mismo artefacto site]
    Download --> Check[Rechazar artefacto con X-Robots-Tag]
    Check --> Publish[Netlify CLI fijado: deploy no-build prod]
    Publish --> Smoke[Comprobar cabeceras, geo, Visitas y enlaces de Libros]
  end
  Publish --> Netlify[Sitio estático y empaquetado de Functions y Edge Function]
```

Fuentes: [workflow](../.github/workflows/ci.yml), [package.json](../package.json), [netlify.toml](../netlify.toml).
Detalle de axe, Lighthouse y cobertura: [calidad.md](calidad.md); permisos y secretos: [seguridad.md](seguridad.md).
Los artefactos se guardan siete días y la concurrencia del deploy no cancela un despliegue en curso.
**Límite:** declarar `environment: production` permite reglas externas, pero el YAML no demuestra que haya aprobación manual ni protección de rama.
