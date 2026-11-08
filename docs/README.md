# Technical documentation

One topic per file. Diagrams describe the code on `master` at `8974b35`;
they do not guarantee external configuration or production state.

- [Guidelines for AI agents](../AGENTS.md)
- [Architecture decisions (ADR)](adr.md)
- [Architecture and UI state](architecture.md) (component and module diagrams)
- [TypeScript types and contracts](types.md) (class diagrams)
- [Features](features.md): Visits, analytics and consent (notice and `/geo` diagram), opt-in animations, theme, books, and Open Graph
- [Visits with GA4](ga4.md): snapshot, setup, local testing, and sequence diagrams
- [Quality](quality.md): tests, coverage, axe, and Lighthouse
- [Security](security.md): CSP, headers (generation diagram), dependencies, and secrets
- [Deployment](deployment.md): CI and publishing (workflow diagram)

Dependency arrows mean «uses»; in class diagrams, composition
represents contained fields, not instantiated classes. TypeScript structural types
are shown as UML classes for readability. Notes identify boundaries or differences
between comments, prior documentation, and code. Credentials and environment variable values are not included.

## Validating diagrams

Each Mermaid block is rendered separately with `@mermaid-js/mermaid-cli` (`mmdc`),
installed outside the repository. No dependency is added to the application.
GitHub renders blocks directly; validation SVGs are not part of the repo.
When a contract or flow changes, update the corresponding diagram and render it again.

Validation for this delivery: 10 blocks rendered without errors using `mmdc` 12.2.0.
