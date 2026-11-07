# Flujo de Visitas

[Índice](README.md) · [Tipos](tipos.md)

## Producción: actualización y lectura desacopladas

```mermaid
sequenceDiagram
  autonumber
  participant Scheduler as Programador de Netlify
  participant Job as visits-snapshot
  participant Refresh as refreshSnapshot
  participant OAuth as Google OAuth
  participant GA as GA4 Data API
  participant Store as Netlify Blobs
  participant API as visits /api/visits/:range
  participant UI as useVisits y UI
  Scheduler->>Job: Ejecución cada 3 h
  Job->>Job: readGa4Config desde entorno servidor
  alt Configuración ausente o inválida
    Job-->>Scheduler: Registra estado y termina sin escribir
  else Configuración disponible
    Job->>Refresh: store y fetchReport inyectados
    loop Rangos 1d, 7d y 30d en serie
      opt Primera petición de esta ejecución
        Refresh->>OAuth: JWT firmado RS256 y scope de lectura
        OAuth-->>Refresh: Token reutilizado en la ejecución
      end
      Refresh->>GA: 7 runReport en paralelo para el rango
      GA-->>Refresh: Respuestas o error
      Refresh->>Refresh: Mapear y validar VisitsReportSchema
    end
    alt Al menos un rango válido actualizado
      Refresh->>Store: Leer informes anteriores válidos
      Store-->>Refresh: Snapshot anterior o ausencia
      Refresh->>Refresh: Conservar rangos previos que fallaron
      Refresh->>Store: setJSON del snapshot combinado
      Store-->>Refresh: Resultado de escritura
      Refresh-->>Job: updated, failed, written
    else Ningún rango renovado
      Refresh-->>Job: written false, no lectura ni escritura
    end
  end
  Note over Store,API: Store de sitio visits, clave snapshot, persiste entre despliegues
  UI->>API: GET del rango, inicialmente 30d
  API->>API: Comprobar método y rango
  alt Método distinto de GET o HEAD
    API-->>UI: 405 y Allow
  else Rango inválido
    API-->>UI: 404
  else Método y rango admitidos
    API->>Store: Leer snapshot
    Store-->>API: JSON, ausencia o error
    API->>API: selectVisitsReport y validación por rango
    alt Snapshot válido para ese rango
      API-->>UI: Informe real, x-visits-source snapshot
    else Falta, lectura falla o informe inválido
      API->>API: buildMockReport y validar
      API-->>UI: Informe de ejemplo, x-visits-source mock
    end
    UI->>UI: Comprobación mínima y dataStateOf
  end
```

Fuentes: [tarea programada](../netlify/functions/visits-snapshot.ts),
[refreshSnapshot](../lib/visitsSnapshot.ts), [configuración y token compartido](../lib/visitsGa4Config.ts),
[OAuth](../lib/googleServiceAccount.ts), [GA4](../lib/visitsGa4.ts),
[Blobs](../lib/visitsBlobStore.ts), [endpoint](../netlify/functions/visits.ts),
[selección de fuentes](../lib/visitsSource.ts).
El horario es `0 */3 * * *`, evaluado en UTC por Netlify; en Atlantic/Canary varía con el horario estacional.
El endpoint público **no** consulta GA4 en directo. La fuente `live` existe como literal de tipo,
pero no se incluye en su lista de fuentes.

La actualización parcial conserva informes anteriores **válidos**, sin límite de antigüedad en
`snapshotReport`. Si falla la escritura de Blobs, el error se propaga: no hay un segundo almacén automático.
Un informe real con cero visitas sigue siendo real; la página presenta su estado vacío, no lo sustituye por mock.
El cliente revalida y la CDN puede cachear 10 minutos, sirviendo copia anterior mientras revalida.
Los países con menos de cinco visitas y los desconocidos se agregan en «Otros».

## Respaldo estático, elección inicial y error de red

```mermaid
sequenceDiagram
  participant Build as Nuxt generate
  participant Nitro as server/api/visits
  participant Static as JSON estático
  participant Page as visits.vue
  participant Client as useVisits
  participant Endpoint as /api/visits/:range
  participant Mock as visitsMock en chunk diferido
  Build->>Nitro: Prerrenderizar 1d, 7d y 30d
  Nitro->>Nitro: Sin VISITS_SNAPSHOT_FILE, seleccionar mock
  Nitro-->>Static: Informes sample true
  Note over Static,Endpoint: En Netlify la función sirve la ruta, el JSON es respaldo sin función
  Page->>Client: Filtro inicial 30d
  Client->>Endpoint: GET /api/visits/30d
  Endpoint-->>Client: Real, mock o error de red
  Client-->>Page: real, sample o failed
  alt Primera respuesta real
    Page->>Page: Mantener 30d y mostrar antigüedad
  else Primera respuesta sample o failed
    Page->>Client: Cambiar filtro a sample
    Client->>Mock: import dinámico y buildMockReport de 30d
    Mock-->>Client: Informe de ejemplo sin petición HTTP
    Client-->>Page: ready y aviso de ejemplo
  end
  opt Selección posterior de 1d, 7d o 30d
    Page->>Client: Cambiar filtro
    Client->>Endpoint: GET del rango
    alt Respuesta utilizable
      Endpoint-->>Client: Informe con sample true o false
      Client-->>Page: Actualizar informe y nota de origen
    else Red caída o respuesta mínima inválida
      Endpoint-->>Client: Error o contenido inválido
      Client-->>Page: status error y Reintentar, conservar informe anterior si existe
    end
  end
```

Fuentes: [Nitro](../server/api/visits/%5Brange%5D.get.ts), [Nuxt](../nuxt.config.ts),
[useVisits](../app/composables/useVisits.ts), [filtro](../lib/visitsFilter.ts),
[página](../app/pages/visits.vue), [almacén local](../lib/visitsFileStore.ts),
[script local](../scripts/visits-snapshot.ts).
En desarrollo puede usarse un fichero mediante `VISITS_SNAPSHOT_FILE`; **no** debe definirse al generar
el respaldo estático. La primera decisión de filtro se realiza una sola vez en la página; no hay
un cambio automático a sample en cada fallo posterior.

**Límite temporal:** `visitsPeriods` calcula los días hasta ayer usando UTC. GA4 interpreta las fechas
del informe según la zona de la propiedad; el código no obtiene esa zona. No se asume equivalencia
con la hora local del visitante ni con Atlantic/Canary durante todo el año.
