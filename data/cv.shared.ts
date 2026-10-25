import type { CvFacts } from './schema'

/**
 * Datos del CV que no cambian con el idioma (fechas, enlaces, imágenes, niveles).
 * Fuente: repo `my-cv` (commit d23cb9e), PDF actual y LinkedIn según lo indicado por Maurizio.
 * Orden: lo más reciente primero.
 *
 * Contacto: solo LinkedIn, CodePen y GitHub. Nada de teléfono, correo ni dirección.
 */
export const cvFacts: CvFacts = {
  fullName: 'Maurizio Rendon',
  resumeUrl: '/Resume-Maurizio-Rendon.pdf',

  contactLinks: [
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/rendon7/' },
    { label: 'GitHub', url: 'https://github.com/mauriz3' },
    { label: 'CodePen', url: 'https://codepen.io/maurirz3' },
  ],

  experience: [
    {
      id: 'octane11',
      company: 'Octane11',
      companyUrl: 'https://www.octane11.com/',
      period: { start: '2022-02', end: null },
      technologyGroups: [{ technologies: ['React', 'TypeScript', 'Node.js', 'Prisma', 'Chart.js', 'Cypress', 'Next.js'] }],
    },
    {
      id: 'system73',
      company: 'System73',
      companyUrl: 'https://system73.com/',
      period: { start: '2016-02', end: '2022-02' },
      technologyGroups: [
        { areaId: 'devops', technologies: ['Jenkins', 'Docker', 'Python', 'Bash', 'Linux', 'AWS'] },
        { areaId: 'frontend', technologies: ['Vue.js', 'Nuxt.js', 'WordPress', 'JavaScript', 'CSS', 'Django'] },
      ],
    },
    {
      id: 'fasican',
      company: 'FASICAN',
      companyUrl: 'https://fasican.org/',
      period: { start: '2014-12', end: '2015-06' },
      technologyGroups: [{ technologies: ['HTML', 'CSS', 'JavaScript', 'PHP'] }],
    },
    {
      id: 'open-canarias',
      company: 'Open Canarias',
      companyUrl: 'https://www.opencanarias.com/',
      period: { start: '2014-03', end: '2014-06' },
      technologyGroups: [{ technologies: ['Java', 'Eclipse'] }],
    },
    {
      id: 'huc',
      company: 'Hospital Universitario de Canarias',
      companyUrl:
        'https://www3.gobiernodecanarias.org/sanidad/scs/organica.jsp?idCarpeta=3da5f513-541b-11de-9665-998e1388f7ed',
      period: { start: '2010-03', end: '2010-06' },
      technologyGroups: [],
    },
  ],

  education: [
    {
      id: 'ull-entrepreneurship',
      institution: 'Universidad de La Laguna',
      institutionUrl: 'https://www.ull.es/',
      period: { start: '2015-09', end: '2016-07' },
    },
    {
      id: 'google-activate',
      institution: 'Google Actívate',
      institutionUrl: 'https://learndigital.withgoogle.com/activatunegocio/course/digital-marketing',
      period: { start: '2014', end: '2014' },
    },
    {
      id: 'ull-degree',
      institution: 'Universidad de La Laguna',
      institutionUrl: 'https://www.ull.es/grados/ingenieria-informatica/',
      period: { start: '2010', end: '2014' },
    },
    {
      id: 'ef-oxford',
      institution: 'EF Academy Oxford',
      institutionUrl: 'https://www.ef.com/wwen/academy/campuses/oxford/',
      period: { start: '2013', end: '2013' },
    },
    {
      id: 'ies-perez-minik',
      institution: 'IES Domingo Pérez Minik',
      institutionUrl:
        'https://www.iesdomingoperezminik.es/dpmweb/category/formacion-profesional/informatica-y-comunicaciones/',
      period: { start: '2008', end: '2010' },
    },
  ],

  /** Fuente: LinkedIn (2026). Allí no constan emisor ni fecha, así que no se ponen. */
  certifications: [{ id: 'accelerated-es6', name: 'Accelerated ES6 JavaScript Training' }],

  projects: [
    { id: 'my-cv', url: 'https://github.com/mauriz3/my-cv', image: 'cv.png', category: 'nuxt' },
    { id: 'webtele', url: 'https://www.webtelehd.com/', image: 'webtele.jpg', category: 'website' },
    {
      id: 'balance-of-the-force',
      url: 'https://codepen.io/maurirz3/full/KKVdYgV',
      image: 'bf.png',
      category: 'codepen',
    },
    {
      id: 'feature-flags-panel',
      url: 'https://codepen.io/maurirz3/full/eYzMyWe',
      image: 'ff.png',
      category: 'codepen',
    },
    {
      id: 'streaming-analytics',
      url: 'https://codepen.io/maurirz3/full/JjYLMrZ',
      image: 'sa.png',
      category: 'codepen',
    },
    { id: 'search-mock', url: 'https://codepen.io/maurirz3/full/JjyYRXq', image: 'sm.png', category: 'codepen' },
  ],

  languages: [
    { id: 'spanish', level: 'C2' },
    { id: 'english', level: 'B2' },
    { id: 'italian', level: 'B1' },
  ],

  /**
   * Áreas para las gráficas de «años por área». Maurizio quiere destacar full stack
   * (backend y frontend) y dar menos peso a DevOps/SysAdmin.
   * Fechas confirmadas por Maurizio: en System73 fue DevOps de feb 2016 a ene 2018 y Frontend
   * de feb 2018 a feb 2022; el Frontend continúa en Octane11. El backend es solo de Octane11 (feb 2022).
   * `end` es el mes límite: el periodo termina justo antes de ese mes.
   */
  skillAreas: [
    {
      id: 'frontend',
      periods: [{ start: '2018-02', end: null }],
      skills: ['JavaScript', 'TypeScript', 'HTML', 'CSS', 'Vue.js', 'Nuxt.js', 'React', 'Next.js', 'Chart.js', 'Cypress', 'WordPress', 'JAMstack', 'Django'],
    },
    {
      id: 'backend',
      periods: [{ start: '2022-02', end: null }],
      skills: ['Node.js', 'API REST', 'Prisma'],
    },
    {
      id: 'devops',
      periods: [{ start: '2016-02', end: '2018-02' }],
      skills: ['Docker', 'AWS', 'Linux', 'Bash', 'Python', 'Git'],
    },
  ],

  /**
   * Radar «Skill profile» (6 ejes del Figma).
   * ⚠️ NIVELES PROVISIONALES DE EJEMPLO (0–5), pendientes de que Maurizio dé los reales.
   * Nunca se muestran como números: el radar no lleva cifras, ticks, tooltip ni leyenda.
   */
  skillProfile: [
    { id: 'frontend', level: 5 },
    { id: 'backend', level: 4 },
    { id: 'apis-data', level: 4 },
    { id: 'ci-cd', level: 2 },
    { id: 'testing', level: 3 },
    { id: 'ux-ui', level: 3 },
  ],
}
