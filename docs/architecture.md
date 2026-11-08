# Architecture

[Index](README.md) · [Types](types.md) · [Visits and GA4](ga4.md) · [Features](features.md) · [Security](security.md) · [Deployment](deployment.md)

## Modules and execution boundaries

```mermaid
flowchart TB
  subgraph Aplicacion[Nuxt 4 and Vue 3 application]
    Raiz[app/app.vue]
    subgraph Layouts[Layouts]
      Layout[default.vue]
    end
    subgraph Paginas[Pages]
      CV[Profile, skills, experience, education, projects]
      Visitas[visits.vue]
      Libros[books.vue: short link without hydration]
      Privacidad[privacy.vue]
    end
    subgraph Componentes[Components]
      UI[AppNav, PageHeader, Panel and cards]
      Charts[visits/* and tabular alternatives]
      Cookies[ConsentBanner and AppFooter]
      Books[BooksSection and BookCover]
    end
    subgraph Composables[Composables]
      UseCV[useCv and usePageSeo]
      UseVisits[useVisits, useVisitsTables and useVisitsNote]
      Motion[useAnimations, useReplayable, useJourney and useCardMotion]
      Consent[useConsentBanner]
    end
    subgraph Biblioteca[lib]
      Dominio[Periods, journey, theme, sidebar and animations]
      Contratos[visitsSchema, visitsFilter and visitsSnapshot]
      Analitica[analytics and consentRegion]
      Fuentes[visitsSource and visitsMock]
      Adaptadores[visitsGa4Config, visitsGa4 and googleServiceAccount]
      Almacen[visitsBlobStore and visitsFileStore]
    end
    subgraph Datos[data]
      DatosCV[cv.shared, cv.en and cv.es]
      Schema[schema.ts: Zod contracts and types]
      GetCV[cv.ts: getCv]
    end
  end
  subgraph Generacion[Nuxt generation and development]
    Nitro[server/api/visits: local file or mock]
    Static[.output/public: HTML, assets and fallback JSON]
  end
  subgraph Netlify[Netlify]
    CDN[CDN: static site]
    subgraph Funciones[Netlify Functions]
      API[visits: /api/visits/:range]
      Job[visits-snapshot: job every 3 h]
    end
    Edge[Edge Function geo: /geo]
    Blobs[Blobs: visits store, snapshot key]
  end
  subgraph Google[Google]
    GA4[GA4 Data API and OAuth]
    Gtag[gtag.js: browser measurement]
  end
  subgraph Entrega[CI/CD]
    CI[GitHub Actions: verify and secrets]
    Deploy[deploy-production: Netlify CLI]
  end
  Raiz --> Layout
  Layout --> Paginas
  Layout --> UI
  Layout --> Cookies
  CV --> UseCV
  CV --> Motion
  CV --> Books
  Visitas --> UseVisits
  Visitas --> Charts
  UseCV --> GetCV
  GetCV --> DatosCV
  GetCV -. types .-> Schema
  Motion --> Dominio
  UseVisits --> Contratos
  UseVisits --> Fuentes
  Cookies --> Consent
  Cookies --> Analitica
  Cookies --> Edge
  Layout --> Gtag
  UseVisits --> API
  API --> Fuentes
  Fuentes --> Almacen
  Job --> Adaptadores
  Job --> Contratos
  Adaptadores --> GA4
  Almacen --> Blobs
  Nitro --> Fuentes
  Nitro --> Almacen
  Nitro --> Static
  Libros --> Static
  CI --> Static
  CI --> Deploy
  Static --> Deploy
  Deploy --> CDN
  Deploy --> Funciones
  Deploy --> Edge
```

**Reading the diagram:** the browser does not call the Data API and does not know service account credentials.
The public function reads an aggregated snapshot; the scheduled job queries GA4.
`lib/` mixes pure logic and I/O adapters: not all of that directory is client or pure code.
The diagram groups modules; it does not represent every import.

Sources: [Nuxt config](../nuxt.config.ts), [layout](../app/layouts/default.vue),
[useCv](../app/composables/useCv.ts), [getCv](../data/cv.ts), [useVisits](../app/composables/useVisits.ts),
[Netlify](../netlify.toml), and [workflow](../.github/workflows/ci.yml).
CV Zod schemas are validated in tests; `getCv` joins facts and copy without parsing in the browser.
`/en/books` and `/es/libros` generate minimal HTML with jump to Profile anchor, not a standalone books page;
Nuxt scripts and payloads are disabled, not the inline jump script.

## Preferences before first paint

```mermaid
flowchart LR
  HTML[Prerendered dark HTML] --> Tema{Valid light or dark choice}
  Tema -->|Yes| Guardado[Apply stored choice]
  Tema -->|No, system or invalid| Oscuro[Discard invalid and use dark]
  Guardado --> ColorMode[color-mode manages class and button]
  Oscuro --> ColorMode
  ColorMode --> Meta[theme-color and color-scheme follow theme]
  Sidebar[Layout inline script] --> Colapsado[Sidebar stored as collapsed]
  Colapsado -->|Yes| Clase[sidebar-collapsed class on html]
  Colapsado -->|No or read failure| Expandido[No collapse class]
  Clase --> Nav[AppNav restores state on mount]
  Expandido --> Nav
  Nav --> Boton[Button toggles state and persists when possible]
  Animaciones[app.vue inline script] --> Preferencia{animations = on}
  Preferencia -->|Yes and no PRM| Full[data-motion full]
  Preferencia -->|No, off or PRM| Reduced[data-motion reduced]
```

Sources: [app.vue](../app/app.vue), [theme](../lib/theme.ts), [sidebar](../lib/sidebar.ts),
[animations](../lib/animations.ts), [AppNav](../app/components/AppNav.vue), and [CSS](../app/assets/css/main.css).
Theme **does not** read system preference. Animations start off; on load, PRM overrides a stored `on`.
Collapse only changes presentation from `xl`; mobile has bottom bar and tablet has rail.
Preference scripts are included in CSP hashes. This flow describes preferences,
not all journey geometric transitions.
