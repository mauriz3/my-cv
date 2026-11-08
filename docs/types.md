# Types and contracts

[Index](README.md)

These are real types and interfaces; composition relationships represent properties,
not an OOP model imposed on Vue.

## CV: facts, translations, and result

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
    areaId: string optional
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
  Cv ..> CvFacts : getCv combines facts
  Cv ..> CvTexts : getCv combines texts by id
  note for Cv "z.infer of CvSchema, does not extend CvFacts or CvTexts"
  note for Book "Real alias: Cv['books'][number]"
  note for CvFacts "z.infer of CvFactsSchema, arrays with Zod-defined minimums"
  note for CvTexts "z.infer of CvTextsSchema, texts by id with z.record"
```

Sources: [data/schema.ts](../data/schema.ts), [data/cv.ts](../data/cv.ts).
Properties omitted for readability. `CvFacts`, `CvTexts`, `Cv`, `TechnologyGroup`, and
`ContactLink` come from `z.infer<typeof ...Schema>`. `Locale` and `ProjectCategory` derive
with `(typeof CONSTANT)[number]`; `Book` via indexed access. `textFor<T>` shares safe access
to translations and `TEXTS_BY_LOCALE` uses `Record<Locale, CvTexts>`.
Final elements of experience, education, projects, and books compose with
`ZodObject.extend(...)`: **schema extension**, not TypeScript `extends` between interfaces.
No invented classes for those anonymous elements.

## Visits and dependency inversion

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
  VisitsSnapshot "1" *-- "0..3" VisitsReport : reports by range
  SelectedReport "1" *-- "1" VisitsReport : report
  SnapshotStore ..> VisitsSnapshot : writes
  SnapshotJobDeps --> SnapshotStore : injected store
  VisitsDataSource ..> VisitsReport : returns or undefined
  VisitsDataSource ..> SnapshotStore : snapshotSource adapter
  RefreshResult ..> VisitsSnapshot : refreshSnapshot result
  Ga4Config "1" *-- "1" ServiceAccount : serviceAccount
  Ga4FetcherOptions ..> VisitsReport : fetchGa4Report
  Ga4Error --|> Error
  GoogleAuthError --|> Error
  note for SnapshotStore "blobSnapshotStore and fileSnapshotStore return structural objects, not concrete classes"
  note for VisitsSnapshot "reports: Partial Record VisitsRange to VisitsReport"
  note for VisitsReport "z.infer of VisitsReportSchema, client imports type without running Zod"
  note for VisitsDataSource "name allows live, snapshot and mock, live not wired yet"
```

Sources: [visitsSchema](../lib/visitsSchema.ts), [visits](../lib/visits.ts),
[snapshot](../lib/visitsSnapshot.ts), [sources](../lib/visitsSource.ts),
[GA4](../lib/visitsGa4.ts), [GA4 config](../lib/visitsGa4Config.ts),
[service account](../lib/googleServiceAccount.ts), [job](../netlify/functions/visits-snapshot.ts).
`ServiceAccount` fields are contract names, **not values**.

- `VisitsRange = (typeof VISITS_RANGES)[number]`; set is `1d | 7d | 30d`.
- `VisitsKpis = VisitsReport['kpis']`, `CountryVisits = VisitsReport['countries'][number]`,
  `KpiKey = keyof VisitsKpis`: do not duplicate contract structures.
- `VisitsFilter` derives from `VISITS_FILTERS`; `VisitsNote` is a union discriminated by `kind`.
- `SnapshotJobDeps.log` uses `Pick<Console, 'info' | 'warn' | 'error'>`.
- `RunReportResponse` inferred from Zod; metric numbers arrive as strings and
  `rowsOf` converts with `Number(...)`, defaulting to zero. **Does not use `z.coerce`**.
- Endpoint validates range with `isVisitsRange`; `VisitsReportSchema` requires typed numbers
  and validates on server. On client `isUsableReport` only checks a subset,
  not full Zod validation.

## Consent and browser adapters

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
    getItem(key) string or null
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
    geo: optional object
  }
  class SidebarStorage {
    <<type alias>>
    getItem(key) string or null
    setItem(key, value) void
  }
  class SidebarRoot {
    classList: Pick DOMTokenList
  }
  ConsentStartAction ..> ConsentChoice : considers stored choice
  ConsentStorage ..> ConsentChoice : readConsent and applyConsent
  Gtag ..> ConsentChoice : updateConsent
  GeoContext ..> ConsentStartAction : country determines action without choice
  note for ConsentStorage "Pick of Storage: getItem and setItem, SidebarStorage repeats same structural alias"
  note for SidebarRoot "classList is Pick of DOMTokenList with toggle"
  note for Gtag "Narrow type for consent update, does not represent full gtag API"
```

Sources: [analytics](../lib/analytics.ts), [consentRegion](../lib/consentRegion.ts),
[geo](../netlify/edge-functions/geo.ts), [sidebar](../lib/sidebar.ts).
`ANALYTICS_CSP_SOURCES` and `CONSENT_OPTIONS` use `as const satisfies ...` to check
shape without losing literals. Shown contracts have no `Omit`
or `Required` derivations; none added for ornament. Shared alias between
`ConsentStorage` and `SidebarStorage` is a possible future extraction, not a refactor done here.
