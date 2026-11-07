# Documentación técnica

Diagramas del código de `master` en `278043d909a16da55414e8aaca40fd5c09b34a61`.
Describen la implementación, no garantizan la configuración externa ni el estado de producción.

- [Arquitectura y estado de la interfaz](arquitectura.md)
- [Tipos TypeScript y contratos](tipos.md)
- [Visitas: GA4, instantáneas y respaldo](visitas.md)
- [Consentimiento y país de la visita](consentimiento.md)
- [CI/CD y cabeceras CSP](ci-cd.md)

Las flechas de dependencia significan «usa»; en los diagramas de clases, la composición
representa campos contenidos, no clases instanciadas. Los tipos estructurales de TypeScript
se muestran como clases UML por legibilidad. Las notas identifican límites o diferencias
entre comentarios, documentación previa y código. No se incluyen credenciales ni valores de variables de entorno.

## Validación de los diagramas

Cada bloque Mermaid se renderiza por separado con `@mermaid-js/mermaid-cli` (`mmdc`),
instalado fuera del repositorio. No se añade ninguna dependencia a la aplicación.
GitHub renderiza los bloques directamente; los SVG de comprobación no forman parte del repo.
Al cambiar un contrato o flujo, actualizar el diagrama correspondiente y volver a renderizarlo.

Validación de esta entrega: 10 bloques renderizados sin errores con `mmdc` 12.2.0.
