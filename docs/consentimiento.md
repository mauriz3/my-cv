# Banner y Consent Mode v2

[Índice](README.md)

```mermaid
sequenceDiagram
  autonumber
  actor Persona
  participant Layout as Layout de producción
  participant Inline as Script inline
  participant Storage as localStorage
  participant GA as gtag.js y Consent Mode
  participant Banner as ConsentBanner
  participant Edge as /geo Edge Function
  participant Pie as AppFooter
  Note over Layout,Banner: Solo se montan analítica, banner y pie si analyticsId no está vacío
  Layout->>Inline: Ejecutar antes del script externo
  Inline->>GA: consent default: las cuatro señales denied
  Note over Inline,GA: wait_for_update 500 ms
  Inline->>Storage: Leer analytics-consent
  opt Elección guardada granted
    Inline->>GA: consent update analytics_storage granted
  end
  Inline->>GA: js y config, Google signals y personalización desactivados
  Layout->>GA: Cargar gtag.js asíncrono, incluso antes de aceptar
  Banner->>Storage: readConsent al montar
  alt Elección válida ya guardada
    Banner->>Banner: No pedir geo, no abrir automáticamente
  else Sin elección válida
    Banner->>Edge: GET /geo, no-store, timeout 3 s
    Edge->>Edge: Leer context.geo.country.code
    Edge-->>Banner: country o null, no-store, nosniff y HSTS
    Banner->>Banner: parseGeoCountry y consentStartAction
    alt UE, EEE, Reino Unido o Suiza
      Banner-->>Persona: Mostrar aviso, analytics_storage sigue denied
    else País ausente, respuesta inválida, error o timeout
      Banner-->>Persona: Mostrar aviso por precaución, sigue denied
    else Otro código de país válido
      Banner->>GA: analytics_storage granted sin aviso
      Note over Banner,Storage: No guardar esta concesión automática
    end
  end
  opt Persona acepta o rechaza el aviso
    Persona->>Banner: Elegir granted o denied
    Banner->>Storage: Guardar elección si es posible
    Banner->>GA: consent update solo analytics_storage
    Banner->>Banner: Cerrar aviso
  end
  opt Cambio posterior desde el pie
    Persona->>Pie: Preferencias de analítica
    Pie->>Banner: reopen, mostrar y solicitar foco
    Banner-->>Persona: Foco en el aviso para volver a elegir
  end
```

Fuentes: [configuración Nuxt](../nuxt.config.ts), [layout](../app/layouts/default.vue),
[analytics](../lib/analytics.ts), [región](../lib/consentRegion.ts),
[Edge Function](../netlify/edge-functions/geo.ts), [banner](../app/components/ConsentBanner.vue),
[estado compartido](../app/composables/useConsentBanner.ts), [pie](../app/components/AppFooter.vue).

## Condiciones exactas

- El build lleva analítica solo si `CONTEXT` indica producción; `analyticsId` queda vacío en el resto.
- El `default` establece `ad_storage`, `analytics_storage`, `ad_user_data` y
  `ad_personalization` en `denied`. Las actualizaciones solo cambian `analytics_storage`:
  aceptar no concede permisos publicitarios.
- La región del aviso es UE27 + Islandia, Liechtenstein, Noruega, Reino Unido y Suiza,
  según `CONSENT_BANNER_COUNTRIES`. `parseGeoCountry` normaliza a mayúsculas y comprueba
  dos letras, pero no consulta un catálogo ISO exhaustivo.
- Una elección persistida prevalece sobre el país actual; al tenerla no se consulta `/geo`.
  La elección `granted` se restaura en el inline; `denied` se conserva por el valor por defecto.
- El país sale del contexto del borde, no de un permiso de geolocalización del navegador.
  La función solo devuelve el código o `null`, sin escribirlo en un almacén; admite GET/HEAD,
  rechaza otros métodos con 405 y no añade CORS. Fuera de Netlify, la ruta puede no existir:
  el fallo se interpreta como país desconocido.
- El banner permanece cerrado mientras se resuelve el país. La espera de gtag (500 ms)
  es menor que el timeout de geo (3 s); pueden vencer en momentos distintos.

## Límites de la descripción

**`denied` no significa ausencia de solicitudes a Google.** El script se carga y configura
antes de la decisión; Consent Mode puede emitir medición sin cookies. Este diagrama no
certifica el contenido de los paquetes de red ni una configuración administrativa de GA4.
`applyConsent` actualiza el consentimiento, pero no implementa un borrado explícito de cookies
existentes al revocar. No debe describirse como bloqueo completo de GA previo a aceptar.
Si falla `setItem`, la actualización vale para la visita actual; los helpers capturan errores
de lectura/escritura, pero el acceso directo a `localStorage` en el componente no está
encerrado en un `try` propio. No se garantiza aquí el comportamiento de un navegador que
impida incluso acceder a esa propiedad.
