# Tipos y contratos

[Índice](README.md)

Son tipos e interfaces reales; las relaciones de composición representan propiedades,
no un modelo orientado a objetos impuesto sobre Vue.

## CV: hechos, traducciones y resultado

```mermaid
classDiagram
  class CvFacts {
    fullName: string
    resumeUrls: object
    experience: array
    education: array
    projects: array
    books: array
    skillAreas: array
  }
  class CvTexts {
    headline: string
    summary: string
    experience: Record
    education: Record
    projects: Record
    books: Record
  }
  class Cv {
    locale: Locale
    resumeUrl: string
    experience: array
    education: array
    projects: array
    skillAreas: array
  }
  class Book {
    id: string
    author: string
    cover: object
    title: string
    genre: string
    reason: string
    coverAlt: string
  }
  class TechnologyGroup {
    areaId: string opcional
    technologies: string[]
  }
  class ContactLink {
    label: string
    url: string
  }
  CvFacts "1" *-- "1..*" ContactLink : contactLinks
  Cv "1" *-- "0..*" ContactLink : contactLinks
  Cv "1" *-- "0..*" Book : books
  CvFacts "1" *-- "0..*" TechnologyGroup : experience.technologyGroups
  Cv "1" *-- "0..*" TechnologyGroup : experience.technologyGroups
  Cv ..> CvFacts : getCv combina hechos
  Cv ..> CvTexts : getCv combina textos por id
  note for Cv "z.infer de CvSchema, no hereda de CvFacts ni CvTexts"
  note for Book "Alias real: Cv['books'][number]"
  note for CvFacts "z.infer de CvFactsSchema, arrays con mínimos definidos por Zod"
  note for CvTexts "z.infer de CvTextsSchema, textos por id con z.record"
```

Fuentes: [data/schema.ts](../data/schema.ts), [data/cv.ts](../data/cv.ts).
Se omiten propiedades para legibilidad. `CvFacts`, `CvTexts`, `Cv`, `TechnologyGroup` y
`ContactLink` proceden de `z.infer<typeof ...Schema>`. `Locale` y `ProjectCategory` se derivan
con `(typeof CONSTANTE)[number]`; `Book` con acceso indexado. `textFor<T>` comparte el acceso
seguro a traducciones y `TEXTS_BY_LOCALE` usa `Record<Locale, CvTexts>`.
Los elementos finales de experiencia, educación, proyectos y libros se componen con
`ZodObject.extend(...)`: **extensión de esquemas**, no `extends` entre interfaces TypeScript.
No se inventan clases para esos elementos anónimos.

## Visitas e inversión de dependencias

```mermaid
classDiagram
  class VisitsReport {
    range: VisitsRange
    generatedAt: string
    sample: boolean
    kpis: object
    timeseries: object
    devices: array
    countries: array
    sources: array
    pages: array
    hours: object
  }
  class VisitsSnapshot {
    version: literal 1
    updatedAt: string
    reports: Partial Record
  }
  class SnapshotStore {
    <<interface>>
    read() Promise~unknown~
    write(snapshot) Promise~void~
  }
  class VisitsDataSource {
    <<interface>>
    name: VisitsSourceName
    report(range) Promise
  }
  class SelectedReport {
    source: VisitsSourceName
  }
  class RefreshResult {
    updated: VisitsRange[]
    failed: array
    written: boolean
  }
  class SnapshotJobDeps {
    env: Record
    fetch: typeof fetch
    now: Date
    log: Pick Console
  }
  class Ga4Config {
    propertyId: string
  }
  class ServiceAccount {
    client_email: string
    private_key: string
  }
  class Ga4FetcherOptions {
    propertyId: string
    getAccessToken() Promise~string~
    fetch: typeof fetch
    now: Date
  }
  class Ga4Error
  class GoogleAuthError
  class Error
  VisitsSnapshot "1" *-- "0..3" VisitsReport : reports por rango
  SelectedReport "1" *-- "1" VisitsReport : report
  SnapshotStore ..> VisitsSnapshot : escribe
  SnapshotJobDeps --> SnapshotStore : store inyectado
  VisitsDataSource ..> VisitsReport : devuelve o undefined
  VisitsDataSource ..> SnapshotStore : adaptador snapshotSource
  RefreshResult ..> VisitsSnapshot : resultado de refreshSnapshot
  Ga4Config "1" *-- "1" ServiceAccount : serviceAccount
  Ga4FetcherOptions ..> VisitsReport : fetchGa4Report
  Ga4Error --|> Error
  GoogleAuthError --|> Error
  note for SnapshotStore "blobSnapshotStore y fileSnapshotStore devuelven objetos estructurales, no clases concretas"
  note for VisitsSnapshot "reports: Partial de Record de VisitsRange a VisitsReport"
  note for VisitsReport "z.infer de VisitsReportSchema, el cliente importa el tipo sin ejecutar Zod"
  note for VisitsDataSource "name admite live, snapshot y mock, live no se conecta actualmente"
```

Fuentes: [visitsSchema](../lib/visitsSchema.ts), [visits](../lib/visits.ts),
[snapshot](../lib/visitsSnapshot.ts), [fuentes](../lib/visitsSource.ts),
[GA4](../lib/visitsGa4.ts), [configuración GA4](../lib/visitsGa4Config.ts),
[cuenta de servicio](../lib/googleServiceAccount.ts), [tarea](../netlify/functions/visits-snapshot.ts).
Los campos de `ServiceAccount` son nombres del contrato, **no valores**.

- `VisitsRange = (typeof VISITS_RANGES)[number]`; el conjunto es `1d | 7d | 30d`.
- `VisitsKpis = VisitsReport['kpis']`, `CountryVisits = VisitsReport['countries'][number]`,
  `KpiKey = keyof VisitsKpis`: no duplican las estructuras del contrato.
- `VisitsFilter` se deriva de `VISITS_FILTERS`; `VisitsNote` es una unión discriminada por `kind`.
- `SnapshotJobDeps.log` usa `Pick<Console, 'info' | 'warn' | 'error'>`.
- `RunReportResponse` se infiere de Zod; los números de métricas llegan como cadenas y
  `rowsOf` los convierte con `Number(...)`, con sustitución por cero. **No usa `z.coerce`**.
- El endpoint valida el rango con `isVisitsRange`; `VisitsReportSchema` exige números ya
  tipados y valida en servidor. En cliente `isUsableReport` solo comprueba un subconjunto,
  no equivale a una validación Zod completa.

## Consentimiento y adaptadores del navegador

```mermaid
classDiagram
  class ConsentChoice {
    <<union>>
    granted
    denied
  }
  class ConsentStartAction {
    <<union>>
    keep-stored
    show-banner
    grant-without-banner
  }
  class ConsentStorage {
    <<type alias>>
    getItem(key) string o null
    setItem(key, value) void
  }
  class Gtag {
    <<function type>>
    command: consent
    action: update
    params: Record
  }
  class GeoContext {
    <<interface>>
    geo: objeto opcional
  }
  class SidebarStorage {
    <<type alias>>
    getItem(key) string o null
    setItem(key, value) void
  }
  class SidebarRoot {
    classList: Pick DOMTokenList
  }
  ConsentStartAction ..> ConsentChoice : considera elección guardada
  ConsentStorage ..> ConsentChoice : readConsent y applyConsent
  Gtag ..> ConsentChoice : updateConsent
  GeoContext ..> ConsentStartAction : país determina acción sin elección
  note for ConsentStorage "Pick de Storage: getItem y setItem, SidebarStorage repite el mismo alias estructural"
  note for SidebarRoot "classList es Pick de DOMTokenList con toggle"
  note for Gtag "Tipo estrecho para consent update, no representa toda la API gtag"
```

Fuentes: [analytics](../lib/analytics.ts), [consentRegion](../lib/consentRegion.ts),
[geo](../netlify/edge-functions/geo.ts), [sidebar](../lib/sidebar.ts).
`ANALYTICS_CSP_SOURCES` y `CONSENT_OPTIONS` usan `as const satisfies ...` para comprobar
forma sin perder literales. En los contratos mostrados no hay derivaciones con `Omit`
ni `Required`; no se añaden por ornamentación. El alias compartido entre
`ConsentStorage` y `SidebarStorage` es una posible extracción futura, no un refactor realizado aquí.
