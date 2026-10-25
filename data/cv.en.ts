import type { CvTexts } from './schema'

/** Textos del CV en inglés. Las claves de cada bloque coinciden con los `id` de `cv.shared.ts`. */
export const textsEn: CvTexts = {
  headline: 'Senior Software Engineer · Full stack (backend and frontend)',
  summary:
    'Senior software engineer with a full stack profile, working mostly on backend and frontend. ' +
    'I build data-driven web platforms, dashboards, PWAs and CMS sites using serverless and JAMstack architectures. ' +
    'Creative thinking + UX + prototyping = Minimum Viable Product. ' +
    'My DevOps background (CI/CD and automation as code) helps me ship reliably.',

  motivation: 'I enjoy helping people and solving problems: I turn complex data into clear, reliable products.',
  endToEnd: 'End to end: from Node APIs and the data layer to React and Vue interfaces.',

  experience: {
    octane11: {
      role: 'Senior Software Engineer',
      location: 'New York',
      summary:
        'B2B platform for data integration and enrichment. Full stack work across backend and frontend.',
      highlights: [
        'Building a dashboard that shows analytics, and a CMS to configure it.',
        'Building API endpoints and backend services in Node.js with Prisma.',
        'Using Chart.js for the charts.',
        'Implementing AI to analyze data, automate processes and assist customers.',
      ],
    },
    system73: {
      role: 'Frontend & DevOps Engineer',
      location: 'San Cristóbal de La Laguna (Tenerife)',
      summary:
        'Software for OTT video delivery: highest resolution and guaranteed delivery for an unlimited ' +
        'number of concurrent linear video streams, with analytics.',
      highlights: [
        'Frontend (2018–2022): Vue, Nuxt, WordPress, JavaScript, CSS, unit tests, documentation, git and Django.',
        'DevOps (2016–2018): Jenkins pipelines, integration tests, Docker, Python, Bash, Linux servers and AWS.',
      ],
    },
    fasican: {
      role: 'New Technologies Project: tools for the social inclusion of deaf people',
      summary:
        'Project financed by the European Social Fund and the State Public Employment Service, to ease ' +
        'contact and communication between FASICAN, deaf people and society through new information and ' +
        'communication technologies.',
      highlights: [
        'Deployed an online video interpretation service in Spanish Sign Language (SVisual).',
        'Researched and implemented ICT solutions.',
        'Web positioning.',
        'Programming in HTML, CSS, JavaScript and PHP.',
        'Created the FASICAN website.',
      ],
    },
    'open-canarias': {
      role: 'University internship',
      summary: 'Developed Java plugins for the Eclipse environment using design patterns.',
      highlights: ['Collaborated on a research project of the R&D department.'],
    },
    huc: {
      role: 'Higher National Diploma internship',
      summary: "Maintenance and management of the hospital's computer systems.",
      highlights: [],
    },
  },

  education: {
    'ull-entrepreneurship': {
      title: 'Entrepreneurial development (Entrepreneurship studies)',
      description: 'Experiential learning programme to design and develop innovative projects.',
    },
    'google-activate': { title: 'Digital Marketing course' },
    'ull-degree': { title: 'Informatics Engineering (Computer Software Engineering)' },
    'ef-oxford': { title: 'General English course (B2)' },
    'ies-perez-minik': { title: 'Higher National Diploma in Systems Administration' },
  },

  projects: {
    'my-cv': {
      title: 'My CV',
      description: 'An interactive and original CV.',
      imageAlt: 'Screenshot of the interactive CV web app',
    },
    webtele: {
      title: 'Webtele',
      description: 'Watch all your favorite TV channels anytime, anywhere.',
      imageAlt: 'Screenshot of the Webtele TV streaming website',
    },
    'balance-of-the-force': {
      title: 'Balance of the Force',
      description: 'A gamified retrospective.',
      imageAlt: 'Screenshot of the Balance of the Force gamified retrospective',
    },
    'feature-flags-panel': {
      title: 'Feature Flags Panel',
      description: 'A functional feature flags panel handler.',
      imageAlt: 'Screenshot of the Feature Flags Panel',
    },
    'streaming-analytics': {
      title: 'Streaming Analytics',
      description: 'A streaming analytics prototype.',
      imageAlt: 'Screenshot of the streaming analytics dashboard prototype',
    },
    'search-mock': {
      title: 'Search mock',
      description: 'A mock of a custom search engine.',
      imageAlt: 'Screenshot of the custom search engine mock',
    },
    'responsive-youtube': {
      title: 'Responsive YouTube',
      description: 'How to insert a responsive YouTube iframe in your website.',
      imageAlt: 'Screenshot of a responsive YouTube iframe demo',
    },
    'status-lights': {
      title: 'Status lights',
      description: 'Status lights with hover effect.',
      imageAlt: 'Screenshot of status lights with hover effect',
    },
  },

  languages: { spanish: 'Spanish', english: 'English', italian: 'Italian' },
  skillAreas: { frontend: 'Front End', backend: 'Back End', devops: 'DevOps' },
}
