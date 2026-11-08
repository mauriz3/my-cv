# Deployment

- CI (`.github/workflows/ci.yml`) runs typecheck, tests with coverage, generate, and audit:check, plus gitleaks, axe, and Lighthouse (`deploy-production` waits for all).
- Only a push to master deploys (`deploy-production`, Netlify CLI with `--no-build`). That job checks out the repo and runs `npm ci --ignore-scripts` so Netlify bundles the `/geo` Edge Function and functions from `netlify/functions` (`netlify.toml` → `[functions]`). It then checks production headers, that `/geo` returns `{country}` with `no-store` and rejects POST (405), that `/api/visits/{1d,7d,30d}` is served by the function (`x-visits-source`) with the report for its range, and that `/en/books` and `/es/libros` return 200 with `og:image`.
- If Netlify builds itself (`netlify.toml`), it runs `npm run test && npm run generate`: if a test fails, there is no deploy. Netlify automatic builds are disabled (confirmed by Maurizio, 2026-11-07), so in practice only GitHub Actions publishes.
- The GitHub `production` environment can require manual approval (Settings → Environments) without changing the workflow.

## CI and deployment flow

```mermaid
flowchart TD
  Evento[Push to master or pull_request] --> Contexto{Push to master}
  Contexto -->|Yes| Produccion[CONTEXT production]
  Contexto -->|No| CIContext[CONTEXT ci]
  Produccion --> Verify
  CIContext --> Verify
  Evento --> Secrets
  subgraph Verify[Job verify]
    Install[Checkout, Node per .nvmrc, npm ci] --> Typecheck[npm run typecheck]
    Typecheck --> Coverage[npm run coverage, 80% threshold]
    Coverage --> Generate[npm run generate]
    Generate --> Audit[npm run audit:check]
    Audit --> Artifact[site artifact from .output/public]
  end
  subgraph Secrets[Job secrets]
    History[Checkout with full history] --> Gitleaks[gitleaks-action]
  end
  Artifact --> A11y[Job a11y: axe on artifact]
  Artifact --> Lighthouse[Job lighthouse: blocking US profile; on push to master also EU profile with notice]
  A11y --> Gate{All four jobs pass and push to master}
  Lighthouse --> Gate
  Artifact --> Gate
  Gitleaks --> Gate
  Gate -->|No| Fin[No deploy-production]
  Gate -->|Yes| Deploy
  subgraph Deploy[Job deploy-production, environment production]
    Code[Checkout, Node, npm ci without scripts] --> Download[Download same site artifact]
    Download --> Check[Reject artifact with X-Robots-Tag]
    Check --> Publish[Pinned Netlify CLI: deploy no-build prod]
    Publish --> Smoke[Check headers, geo, Visits, Books links]
  end
  Publish --> Netlify[Static site and Functions and Edge Function bundle]
```

Sources: [workflow](../.github/workflows/ci.yml), [package.json](../package.json), [netlify.toml](../netlify.toml).
axe, Lighthouse, and coverage details: [quality.md](quality.md); permissions and secrets: [security.md](security.md).
Artifacts are kept seven days and deploy concurrency does not cancel a deploy in progress.
**Limit:** declaring `environment: production` allows external rules, but the YAML does not prove manual approval or branch protection exists.
