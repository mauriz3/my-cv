# Arquitectura

[Índice](README.md) · [Tipos](tipos.md) · [Visitas y GA4](ga4.md) · [Funcionalidades](funcionalidades.md) · [Seguridad](seguridad.md) · [Despliegue](despliegue.md)

## Módulos y límites de ejecución

```mermaid
flowchart TB
  subgraph Aplicacion[Aplicación Nuxt 4 y Vue 3]
    Raiz[app/app.vue]
    subgraph Layouts[Layouts]
      Layout[default.vue]
    end
    subgraph Paginas[Páginas]
      CV[Perfil, habilidades, experiencia, formación y proyectos]
      Visitas[visits.vue]
      Libros[books.vue: enlace corto sin hidratación]
      Privacidad[privacy.vue]
    end
    subgraph Componentes[Componentes]
      UI[AppNav, PageHeader, Panel y tarjetas]
      Charts[visits/* y tablas alternativas]
      Cookies[ConsentBanner y AppFooter]
      Books[BooksSection y BookCover]
    end
    subgraph Composables[Composables]
      UseCV[useCv y usePageSeo]
      UseVisits[useVisits, useVisitsTables y useVisitsNote]
      Motion[useAnimations, useReplayable, useJourney y useCardMotion]
      Consent[useConsentBanner]
    end
    subgraph Biblioteca[lib]
      Dominio[Periodos, recorrido, tema, sidebar y animaciones]
      Contratos[visitsSchema, visitsFilter y visitsSnapshot]
      Analitica[analytics y consentRegion]
      Fuentes[visitsSource y visitsMock]
      Adaptadores[visitsGa4Config, visitsGa4 y googleServiceAccount]
      Almacen[visitsBlobStore y visitsFileStore]
    end
    subgraph Datos[data]
      DatosCV[cv.shared, cv.en y cv.es]
      Schema[schema.ts: contratos Zod y tipos]
      GetCV[cv.ts: getCv]
    end
  end
  subgraph Generacion[Generación y desarrollo Nuxt]
    Nitro[server/api/visits: fichero local o mock]
    Static[.output/public: HTML, assets y JSON de respaldo]
  end
  subgraph Netlify[Netlify]
    CDN[CDN: sitio estático]
    subgraph Funciones[Funciones Netlify]
      API[visits: /api/visits/:range]
      Job[visits-snapshot: tarea cada 3 h]
    end
    Edge[Edge Function geo: /geo]
    Blobs[Blobs: store visits, clave snapshot]
  end
  subgraph Google[Google]
    GA4[GA4 Data API y OAuth]
    Gtag[gtag.js: medición del navegador]
  end
  subgraph Entrega[CI/CD]
    CI[GitHub Actions: verify y secrets]
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
  GetCV -. tipos .-> Schema
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

**Lectura:** el navegador no llama a la Data API ni conoce las credenciales de la cuenta de servicio.
La función pública lee un snapshot agregado; la tarea programada es quien consulta GA4.
`lib/` mezcla lógica pura y adaptadores con E/S: no todo ese directorio es código de cliente ni puro.
El diagrama agrupa módulos, no representa cada importación.

Fuentes: [configuración Nuxt](../nuxt.config.ts), [layout](../app/layouts/default.vue),
[useCv](../app/composables/useCv.ts), [getCv](../data/cv.ts), [useVisits](../app/composables/useVisits.ts),
[Netlify](../netlify.toml) y [workflow](../.github/workflows/ci.yml).
Los esquemas Zod del CV se validan en tests; `getCv` une hechos y textos sin parsear en el navegador.
`/en/books` y `/es/libros` generan HTML mínimo con salto al ancla del Perfil, no una página de libros independiente;
se desactivan scripts de Nuxt y payloads, no el script inline de salto.

## Preferencias antes del primer pintado

```mermaid
flowchart LR
  HTML[HTML prerrenderizado oscuro] --> Tema{Elección light o dark válida}
  Tema -->|Sí| Guardado[Aplicar elección guardada]
  Tema -->|No, system o valor inválido| Oscuro[Descartar valor inválido y usar dark]
  Guardado --> ColorMode[color-mode gestiona clase y botón]
  Oscuro --> ColorMode
  ColorMode --> Meta[theme-color y color-scheme siguen al tema]
  Sidebar[Script inline del layout] --> Colapsado{Sidebar guardado como colapsado}
  Colapsado -->|Sí| Clase[Clase sidebar-collapsed en html]
  Colapsado -->|No o fallo de lectura| Expandido[Sin clase de colapso]
  Clase --> Nav[AppNav restaura estado al montar]
  Expandido --> Nav
  Nav --> Boton[Botón invierte estado y persiste si es posible]
  Animaciones[Script inline de app.vue] --> Preferencia{animations = on}
  Preferencia -->|Sí y sin PRM| Full[data-motion full]
  Preferencia -->|No, off o PRM| Reduced[data-motion reduced]
```

Fuentes: [app.vue](../app/app.vue), [theme](../lib/theme.ts), [sidebar](../lib/sidebar.ts),
[animations](../lib/animations.ts), [AppNav](../app/components/AppNav.vue) y [CSS](../app/assets/css/main.css).
El tema **no** consulta la preferencia del sistema. Las animaciones arrancan apagadas; al cargar, PRM manda sobre un `on` guardado.
El colapso solo cambia la presentación desde `xl`; en móvil hay barra inferior y en tablet raíl.
Los scripts de preferencias entran en los hashes CSP. Este flujo describe las preferencias,
no todas las transiciones geométricas del recorrido.
