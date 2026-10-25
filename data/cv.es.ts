import type { CvTexts } from './schema'

/** Textos del CV en español. Las claves de cada bloque coinciden con los `id` de `cv.shared.ts`. */
export const textsEs: CvTexts = {
  headline: 'Senior Software Engineer · Full stack (backend y frontend)',
  summary:
    'Ingeniero de software senior con perfil full stack, centrado sobre todo en backend y frontend. ' +
    'Construyo plataformas web basadas en datos, dashboards, PWAs y sitios CMS con arquitecturas serverless y JAMstack. ' +
    'Pensamiento creativo + UX + prototipado = Producto Mínimo Viable. ' +
    'Mi experiencia en DevOps (CI/CD y automatización como código) me ayuda a entregar con fiabilidad.',

  motivation: 'Me gusta ayudar y resolver problemas: convierto datos complejos en productos claros y fiables.',
  endToEnd:
    'De punta a punta: desde las APIs en Node y la capa de datos hasta las interfaces en React y Vue.',

  experience: {
    octane11: {
      role: 'Senior Software Engineer',
      location: 'Nueva York',
      summary:
        'Plataforma B2B de integración y enriquecimiento de datos. Trabajo full stack, tanto en backend como en frontend.',
      highlights: [
        'Desarrollo de un dashboard que muestra analíticas y de un CMS para configurarlo.',
        'Desarrollo de endpoints de API y servicios de backend en Node.js.',
        'Uso de Chart.js para las gráficas.',
        'Implementación de IA para analizar datos, automatizar procesos y asistir al cliente.',
      ],
    },
    system73: {
      role: 'Ingeniero Frontend y DevOps',
      location: 'Tenerife',
      summary:
        'Software para distribución de vídeo OTT: máxima resolución y entrega garantizada para un número ' +
        'ilimitado de streams lineales simultáneos, con analíticas.',
      highlights: [
        'Frontend (2018–2022): Vue, Nuxt, WordPress, JavaScript, CSS, tests unitarios, documentación, git y Django.',
        'DevOps (2016–2018): pipelines de Jenkins, tests de integración, Docker, Python, Bash, servidores Linux y AWS.',
      ],
    },
    fasican: {
      role: 'Proyecto de Nuevas Tecnologías: herramientas para la inclusión social de personas sordas',
      summary:
        'Proyecto financiado por el Fondo Social Europeo y el Servicio Público de Empleo Estatal, para facilitar ' +
        'el contacto y la comunicación entre FASICAN, las personas sordas y la sociedad mediante las nuevas ' +
        'tecnologías de la información y la comunicación.',
      highlights: [
        'Puesta en marcha de un servicio online de videointerpretación en Lengua de Signos Española (SVisual).',
        'Investigación e implantación de soluciones TIC.',
        'Posicionamiento web.',
        'Programación en HTML, CSS, JavaScript y PHP.',
        'Creación del sitio web de FASICAN.',
      ],
    },
    'open-canarias': {
      role: 'Prácticas universitarias',
      summary: 'Desarrollo de plugins Java para el entorno Eclipse aplicando patrones de diseño.',
      highlights: ['Colaboración en un proyecto de investigación del departamento de I+D.'],
    },
    huc: {
      role: 'Prácticas de Técnico Superior',
      summary: 'Mantenimiento y gestión de los sistemas informáticos del hospital.',
      highlights: [],
    },
  },

  education: {
    'ull-entrepreneurship': {
      title: 'Desarrollo emprendedor (estudios de emprendimiento)',
      description: 'Programa de aprendizaje experiencial para diseñar y desarrollar proyectos innovadores.',
    },
    'google-activate': { title: 'Curso de Marketing Digital' },
    'ull-degree': { title: 'Ingeniería Informática (Ingeniería del Software)' },
    'ef-oxford': { title: 'Curso de inglés general (B2)' },
    'ies-perez-minik': { title: 'Técnico Superior en Administración de Sistemas' },
  },

  projects: {
    'my-cv': {
      title: 'Mi CV',
      description: 'Un CV interactivo y original.',
      imageAlt: 'Captura de la aplicación web del CV interactivo',
    },
    webtele: {
      title: 'Webtele',
      description: 'Mira tus canales de TV favoritos cuando quieras y donde quieras.',
      imageAlt: 'Captura del sitio web de televisión en streaming Webtele',
    },
    'balance-of-the-force': {
      title: 'Balance of the Force',
      description: 'Una retrospectiva gamificada.',
      imageAlt: 'Captura de Balance of the Force, una retrospectiva gamificada',
    },
    'feature-flags-panel': {
      title: 'Feature Flags Panel',
      description: 'Un panel funcional para gestionar feature flags.',
      imageAlt: 'Captura del panel de feature flags',
    },
    'streaming-analytics': {
      title: 'Streaming Analytics',
      description: 'Un prototipo de analíticas de streaming.',
      imageAlt: 'Captura del prototipo del dashboard de analíticas de streaming',
    },
    'search-mock': {
      title: 'Search mock',
      description: 'Una maqueta de un buscador personalizado.',
      imageAlt: 'Captura de la maqueta del buscador personalizado',
    },
    'responsive-youtube': {
      title: 'YouTube responsive',
      description: 'Cómo insertar un iframe de YouTube adaptable en tu web.',
      imageAlt: 'Captura de una demo de iframe de YouTube adaptable',
    },
    'status-lights': {
      title: 'Luces de estado',
      description: 'Luces de estado con efecto al pasar el ratón.',
      imageAlt: 'Captura de luces de estado con efecto al pasar el ratón',
    },
  },

  languages: { spanish: 'Español', english: 'Inglés', italian: 'Italiano' },
  skillAreas: { frontend: 'Frontend', backend: 'Backend', devops: 'DevOps' },
}
