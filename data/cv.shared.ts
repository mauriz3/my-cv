import type { CvFacts } from './schema'

/**
 * CV data that does not change with the language (dates, links, images, levels).
 * Source: repo `my-cv` (commit d23cb9e), current PDF and LinkedIn as indicated by Maurizio.
 * Order: Latest first.
 *
 * Contact: LinkedIn, CodePen and GitHub only. No phone, mail, or address.
 */
export const cvFacts: CvFacts = {
  fullName: 'Maurizio Rendon',
  /** PDF por idioma (Resume-Maurizio-Rendon-{en,es}.pdf en `public/`). */
  resumeUrls: {
    en: '/Resume-Maurizio-Rendon-en.pdf',
    es: '/Resume-Maurizio-Rendon-es.pdf',
  },

  /** Global button spec order (header and tab): LinkedIn → CodePen → GitHub. */
  contactLinks: [
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/rendon7/' },
    { label: 'CodePen', url: 'https://codepen.io/maurirz3' },
    { label: 'GitHub', url: 'https://github.com/mauriz3' },
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

  /** Source: LinkedIn (2026). There is no issuer or date there, so they are not listed. */
  certifications: [{ id: 'accelerated-es6', name: 'Accelerated ES6 JavaScript Training' }],

  projects: [
    { id: 'my-cv', url: 'https://github.com/mauriz3/my-cv', image: 'cv.webp', category: 'nuxt' },
    { id: 'webtele', url: 'https://www.webtelehd.com/', image: 'webtele.jpg', category: 'website' },
    {
      id: 'balance-of-the-force',
      url: 'https://codepen.io/maurirz3/full/KKVdYgV',
      image: 'bf.webp',
      category: 'codepen',
    },
    {
      id: 'feature-flags-panel',
      url: 'https://codepen.io/maurirz3/full/eYzMyWe',
      image: 'ff.webp',
      category: 'codepen',
    },
    {
      id: 'streaming-analytics',
      url: 'https://codepen.io/maurirz3/full/JjYLMrZ',
      image: 'sa.webp',
      category: 'codepen',
    },
    { id: 'search-mock', url: 'https://codepen.io/maurirz3/full/JjyYRXq', image: 'sm.webp', category: 'codepen' },
  ],

  /** Spanish edition covers (Tanda D), optimised for `public/books/`. */
  books: [
    {
      id: 'enigma-room-622',
      author: 'Joël Dicker',
      cover: { src: '/books/enigma-habitacion-622.webp', width: 317, height: 500 },
    },
    {
      id: 'surrounded-by-idiots',
      author: 'Thomas Erikson',
      cover: { src: '/books/rodeados-de-idiotas.webp', width: 333, height: 500 },
    },
  ],

  languages: [
    { id: 'spanish', level: 'C2' },
    { id: 'english', level: 'B2' },
    { id: 'italian', level: 'B1' },
  ],

  /**
   * Areas for the “years by area” graphs. Maurizio wants to highlight full stack
   * (backend y frontend) y dar menos peso a DevOps/SysAdmin.
   * Fechas confirmadas por Maurizio: en System73 fue DevOps de feb 2016 a ene 2018 y Frontend
   * feb 2018 to Feb 2022; Frontend continues at Octane11. The backend is Octane11 only (Feb 2022).
   * `end` is the cutoff month: the period ends just before that month.
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
      skills: ['Node.js', 'REST APIs', 'Prisma'],
    },
    {
      id: 'devops',
      periods: [{ start: '2016-02', end: '2018-02' }],
      skills: ['Docker', 'Linux', 'Bash', 'Python', 'Git'],
    },
  ],

  /**
   * Skill profile radar (6 axes: first at the top, then clockwise, as in Figma).
   * Relative 0–1 values measured from Figma (/workspace/my-cv-plan/radar-valores.md).
   * They are never displayed as numbers: the radar does not carry figures, ticks, tooltip or legend.
   */
  skillProfile: [
    { id: 'frontend', level: 0.95 },
    { id: 'backend', level: 0.85 },
    { id: 'apis-data', level: 0.8 },
    { id: 'ci-cd', level: 0.4 },
    { id: 'testing', level: 0.6 },
    { id: 'ux-ui', level: 0.55 },
  ],

}
