# Documentación técnica

Un tema, un fichero. Los diagramas describen el código de `master` en `8974b35`;
no garantizan la configuración externa ni el estado de producción.

- [Normas para agentes de IA](../AGENTS.md)
- [Decisiones de arquitectura (ADR)](adr.md)
- [Arquitectura y estado de la interfaz](arquitectura.md) (diagramas de componentes y módulos)
- [Tipos TypeScript y contratos](tipos.md) (diagramas de clases)
- [Funcionalidades](funcionalidades.md): Visitas, analítica y consentimiento (diagrama del aviso y `/geo`), animaciones opt-in, tema, libros y Open Graph
- [Visitas con GA4](ga4.md): instantánea, puesta en marcha, pruebas en local y diagramas de secuencia
- [Calidad](calidad.md): tests, cobertura, axe y Lighthouse
- [Seguridad](seguridad.md): CSP, cabeceras (diagrama de generación), dependencias y secretos
- [Despliegue](despliegue.md): CI y publicación (diagrama del workflow)

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
