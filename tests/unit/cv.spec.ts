import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getCv } from '../../data/cv'
import { cvFacts } from '../../data/cv.shared'
import { textsEn } from '../../data/cv.en'
import { textsEs } from '../../data/cv.es'
import { buildHeroCards, HERO_CARD_IDS, type HeroCardId } from '../../data/hero'
import { CvFactsSchema, CvSchema, CvTextsSchema, LOCALES, MAX_SKILL_LEVEL, PROJECT_CATEGORIES } from '../../data/schema'
import { formatPartialDate, isSingleDate } from '../../lib/period'
import { monthsInPeriod, toMonthIndex, yearsInPeriods, yearsLabel } from '../../lib/years'

const ALLOWED_CONTACT_HOSTS = ['www.linkedin.com', 'github.com', 'codepen.io']
const GENERIC_ALT_TEXTS = ['image', 'imagen', 'img', 'photo', 'foto', 'screenshot', 'captura']
const PERSONAL_DATA_PATTERNS = [/@/, /mailto:/i, /tel:/i, /\+?\d[\d\s().-]{8,}\d/]
const MAX_AREA_YEARS = 50
const MAX_MOTIVATION_CHARS = 220
const END_TO_END_KEYWORDS = ['Node', 'React', 'Vue']

const byIdSorted = (ids: string[]) => [...ids].sort()
const textBlocks = [
  { name: 'en', texts: textsEn },
  { name: 'es', texts: textsEs },
]

/** Todos los textos visibles del CV de un idioma, para buscar datos personales. */
function visibleStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(visibleStrings)
  if (value && typeof value === 'object') return Object.values(value).flatMap(visibleStrings)
  return []
}

describe('esquemas', () => {
  it('los datos comunes cumplen el esquema', () => {
    expect(() => CvFactsSchema.parse(cvFacts)).not.toThrow()
  })

  it.each(textBlocks)('los textos «$name» cumplen el esquema', ({ texts }) => {
    expect(() => CvTextsSchema.parse(texts)).not.toThrow()
  })

  it.each(LOCALES)('getCv(%s) devuelve un CV válido', (locale) => {
    expect(CvSchema.parse(getCv(locale)).locale).toBe(locale)
  })
})

describe('idiomas', () => {
  it.each(textBlocks)('«$name» tiene un texto por cada id y ninguno de más', ({ texts }) => {
    expect(byIdSorted(Object.keys(texts.experience))).toEqual(byIdSorted(cvFacts.experience.map((e) => e.id)))
    expect(byIdSorted(Object.keys(texts.education))).toEqual(byIdSorted(cvFacts.education.map((e) => e.id)))
    expect(byIdSorted(Object.keys(texts.projects))).toEqual(byIdSorted(cvFacts.projects.map((p) => p.id)))
    expect(byIdSorted(Object.keys(texts.languages))).toEqual(byIdSorted(cvFacts.languages.map((l) => l.id)))
    expect(byIdSorted(Object.keys(texts.skillAreas))).toEqual(byIdSorted(cvFacts.skillAreas.map((a) => a.id)))
  })

  it('los ids no se repiten dentro de cada bloque', () => {
    const blocks = [cvFacts.experience, cvFacts.education, cvFacts.projects, cvFacts.skillAreas]
    for (const block of blocks) {
      const ids = block.map((item) => item.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})

describe('fechas', () => {
  it('cada periodo termina el mismo mes o después de empezar', () => {
    const periods = [...cvFacts.experience, ...cvFacts.education].map((item) => item.period)
    for (const { start, end } of periods) {
      if (end !== null) expect(toMonthIndex(end)).toBeGreaterThanOrEqual(toMonthIndex(start))
    }
  })

  it('la experiencia va de la más reciente a la más antigua', () => {
    const starts = cvFacts.experience.map((item) => toMonthIndex(item.period.start))
    expect(starts).toEqual([...starts].sort((a, b) => b - a))
  })

  it('solo el puesto actual (Octane11) está abierto y System73 ya no es «actualidad»', () => {
    const open = cvFacts.experience.filter((item) => item.period.end === null).map((item) => item.id)
    expect(open).toEqual(['octane11'])
    expect(cvFacts.experience.find((item) => item.id === 'system73')?.period.end).toBe('2022-02')
  })
})

describe('enlaces e imágenes', () => {
  it('el contacto son solo LinkedIn, GitHub y CodePen, sin duplicados', () => {
    const hosts = cvFacts.contactLinks.map((link) => new URL(link.url).host)
    expect(byIdSorted(hosts)).toEqual(byIdSorted(ALLOWED_CONTACT_HOSTS))
  })

  it.each(LOCALES)('«%s»: el texto alternativo de cada imagen es descriptivo', (locale) => {
    for (const project of getCv(locale).projects) {
      const alt = project.imageAlt.trim().toLowerCase()
      expect(GENERIC_ALT_TEXTS).not.toContain(alt)
      expect(alt.split(/\s+/).length).toBeGreaterThanOrEqual(3)
    }
  })
})

describe('datos personales', () => {
  it.each(LOCALES)('«%s» no contiene correo, teléfono ni dirección', (locale) => {
    const cv = getCv(locale)
    const texts = visibleStrings({ ...cv, contactLinks: undefined, resumeUrl: undefined })
    for (const text of texts) {
      for (const pattern of PERSONAL_DATA_PATTERNS) {
        expect(text, `«${text}» coincide con ${pattern}`).not.toMatch(pattern)
      }
    }
  })
})

describe('habilidades', () => {
  const allSkills = cvFacts.skillAreas.flatMap((area) => area.skills)
  const REQUIRED_SKILLS = ['React', 'Next.js', 'TypeScript', 'Chart.js', 'Cypress', 'Node.js']

  it('incluye las habilidades actuales de Octane11', () => {
    expect(allSkills).toEqual(expect.arrayContaining(REQUIRED_SKILLS))
  })

  it('no incluye Jenkins', () => {
    expect(allSkills).not.toContain('Jenkins')
  })

  const skillsOf = (areaId: string) => cvFacts.skillAreas.find((area) => area.id === areaId)?.skills ?? []

  it('el Back End solo tiene lo de Octane11: Node.js, API REST y Prisma', () => {
    expect(skillsOf('backend')).toEqual(['Node.js', 'API REST', 'Prisma'])
  })

  it('Python va en DevOps (System73) y Django en Front End', () => {
    expect(skillsOf('devops')).toContain('Python')
    expect(skillsOf('frontend')).toContain('Django')
    expect(skillsOf('backend')).not.toContain('Python')
    expect(skillsOf('backend')).not.toContain('Django')
  })

  it('el backend empieza en Octane11 (feb 2022)', () => {
    const backend = cvFacts.skillAreas.find((area) => area.id === 'backend')
    expect(backend?.periods).toEqual([{ start: '2022-02', end: null }])
  })
})

describe('idiomas confirmados por Maurizio', () => {
  it('Español C2 · Inglés B2 · Italiano B1, igual que en el PDF', () => {
    expect(cvFacts.languages).toEqual([
      { id: 'spanish', level: 'C2' },
      { id: 'english', level: 'B2' },
      { id: 'italian', level: 'B1' },
    ])
  })
})

describe('tecnologías por puesto', () => {
  const areaIds = cvFacts.skillAreas.map((area) => area.id)

  it.each(cvFacts.experience)('«$id»: chips no vacíos, sin duplicados ni datos personales', ({ technologyGroups }) => {
    const technologies = technologyGroups.flatMap((group) => group.technologies)
    expect(new Set(technologies).size).toBe(technologies.length)
    for (const technology of technologies) {
      expect(technology.trim()).not.toBe('')
      for (const pattern of PERSONAL_DATA_PATTERNS) expect(technology).not.toMatch(pattern)
    }
  })

  it('los grupos por área apuntan a un área existente', () => {
    for (const { technologyGroups } of cvFacts.experience) {
      for (const { areaId } of technologyGroups) if (areaId) expect(areaIds).toContain(areaId)
    }
  })

  it('System73 agrupa DevOps (con Jenkins, dato histórico) y Front End', () => {
    const system73 = cvFacts.experience.find((job) => job.id === 'system73')
    expect(system73?.technologyGroups.map((group) => group.areaId)).toEqual(['devops', 'frontend'])
    expect(system73?.technologyGroups[0]?.technologies).toContain('Jenkins')
  })

  it('Octane11 incluye Prisma', () => {
    const octane11 = cvFacts.experience.find((job) => job.id === 'octane11')
    expect(octane11?.technologyGroups.flatMap((group) => group.technologies)).toContain('Prisma')
  })

  it('el Hospital no lleva chips', () => {
    expect(cvFacts.experience.find((job) => job.id === 'huc')?.technologyGroups).toEqual([])
  })
})

describe('certificaciones', () => {
  it('incluye «Accelerated ES6 JavaScript Training» (sin emisor ni fecha: no constan en la fuente)', () => {
    expect(cvFacts.certifications).toEqual([{ id: 'accelerated-es6', name: 'Accelerated ES6 JavaScript Training' }])
  })
})

describe('ubicaciones', () => {
  it.each(textBlocks)('«$name»: System73 está en San Cristóbal de La Laguna (Tenerife)', ({ texts }) => {
    expect(texts.experience.system73?.location).toBe('San Cristóbal de La Laguna (Tenerife)')
  })
})

describe('áreas confirmadas por Maurizio', () => {
  const periodsOf = (areaId: string) => cvFacts.skillAreas.find((area) => area.id === areaId)?.periods

  it('DevOps dura 2 años (feb 2016 – ene 2018) y Frontend empieza justo después', () => {
    expect(periodsOf('devops')).toEqual([{ start: '2016-02', end: '2018-02' }])
    expect(periodsOf('frontend')).toEqual([{ start: '2018-02', end: null }])
  })
})

describe('motivación y «End to end»', () => {
  it.each(LOCALES)('«%s»: la motivación es una frase corta y no vacía', (locale) => {
    const { motivation } = getCv(locale)
    expect(motivation.trim()).not.toBe('')
    expect(motivation.length).toBeLessThanOrEqual(MAX_MOTIVATION_CHARS)
  })

  it.each(LOCALES)('«%s»: la tarjeta «End to end» nombra el stack real', (locale) => {
    const { endToEnd } = getCv(locale)
    for (const keyword of END_TO_END_KEYWORDS) expect(endToEnd).toContain(keyword)
  })
})

describe('años por área', () => {
  const now = new Date(2026, 9, 24) // 24 oct 2026

  it('calcula los meses de un periodo cerrado y de uno abierto', () => {
    expect(monthsInPeriod({ start: '2016-02', end: '2018-02' }, now)).toBe(24)
    expect(monthsInPeriod({ start: '2022-02', end: null }, now)).toBe(56)
  })

  it('suma varios periodos con un decimal', () => {
    const periods = [
      { start: '2016-02', end: '2018-02' },
      { start: '2022-02', end: '2023-02' },
    ]
    expect(yearsInPeriods(periods, now)).toBe(3)
  })

  it('el frontend y el backend pesan más que DevOps', () => {
    const years = Object.fromEntries(
      cvFacts.skillAreas.map((area) => [area.id, yearsInPeriods(area.periods, now)]),
    )
    expect(years.frontend).toBeGreaterThan(years.devops ?? Infinity)
    expect(years.backend).toBeGreaterThan(years.devops ?? Infinity)
    for (const value of Object.values(years)) {
      expect(value).toBeGreaterThan(0)
      expect(value).toBeLessThan(MAX_AREA_YEARS)
    }
  })
})

describe('etiquetas de años', () => {
  const now = new Date(2026, 9, 24) // 24 oct 2026

  it('un área abierta muestra el mínimo con «+» y una cerrada el valor aproximado', () => {
    expect(yearsLabel([{ start: '2018-02', end: null }], now)).toBe('8+')
    expect(yearsLabel([{ start: '2022-02', end: null }], now)).toBe('4+')
    expect(yearsLabel([{ start: '2016-02', end: '2018-02' }], now)).toBe('~2')
  })
})

describe('fechas según el idioma', () => {
  it('formatea mes y año en inglés y en español', () => {
    expect(formatPartialDate('2022-02', 'en')).toBe('Feb 2022')
    expect(formatPartialDate('2022-02', 'es')).toBe('feb 2022')
  })

  it('una fecha con solo año se muestra como año', () => {
    expect(formatPartialDate('2014', 'en')).toBe('2014')
  })

  it('detecta los periodos de una sola fecha', () => {
    expect(isSingleDate({ start: '2014', end: '2014' })).toBe(true)
    expect(isSingleDate({ start: '2010', end: '2014' })).toBe(false)
    expect(isSingleDate({ start: '2022-02', end: null })).toBe(false)
  })
})

describe('proyectos', () => {
  it('son 6: sin «Responsive YouTube» ni «Status lights» (decisión de Maurizio)', () => {
    const ids = cvFacts.projects.map((project) => project.id)
    expect(ids).toHaveLength(6)
    expect(ids).not.toContain('responsive-youtube')
    expect(ids).not.toContain('status-lights')
  })
})

describe('filtro de proyectos', () => {
  it('cada categoría del filtro (Nuxt.js · CodePen · Website) tiene al menos un proyecto', () => {
    for (const category of PROJECT_CATEGORIES) {
      expect(cvFacts.projects.some((project) => project.category === category)).toBe(true)
    }
  })
})

describe('radar «Skill profile»', () => {
  const RADAR_AXIS_IDS = ['frontend', 'backend', 'apis-data', 'ci-cd', 'testing', 'ux-ui']

  it('tiene los 6 ejes del Figma, sin ids repetidos', () => {
    const ids = cvFacts.skillProfile.map((axis) => axis.id)
    expect(ids).toEqual(RADAR_AXIS_IDS)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('los niveles son enteros entre 0 y MAX_SKILL_LEVEL', () => {
    for (const { level } of cvFacts.skillProfile) {
      expect(Number.isInteger(level)).toBe(true)
      expect(level).toBeGreaterThanOrEqual(0)
      expect(level).toBeLessThanOrEqual(MAX_SKILL_LEVEL)
    }
  })

  it.each(textBlocks)('«$name»: cada eje tiene nombre y ninguno lleva cifras', ({ texts }) => {
    expect(byIdSorted(Object.keys(texts.skillProfile))).toEqual(byIdSorted(RADAR_AXIS_IDS))
    for (const label of Object.values(texts.skillProfile)) expect(label).not.toMatch(/\d/)
  })

  it('SkillChart no pinta números: sin ticks, sin tooltip ni eventos', () => {
    const source = readFileSync(new URL('../../app/components/SkillChart.vue', import.meta.url), 'utf8')
    expect(source).toMatch(/ticks:\s*\{\s*display:\s*false\s*\}/)
    expect(source).toMatch(/events:\s*\[\]/)
    expect(source).not.toMatch(/Tooltip|Legend/)
  })
})

describe('tarjetas del hero', () => {
  const labels = (locale: string) => ({
    present: locale === 'es' ? 'Actualidad' : 'Present',
    cards: Object.fromEntries(HERO_CARD_IDS.map((id) => [id, `label-${id}`])) as Record<HeroCardId, string>,
  })

  it.each(LOCALES)('«%s»: las 8 tarjetas, en orden y con texto', (locale) => {
    const cards = buildHeroCards(getCv(locale), labels(locale))
    expect(cards.map((card) => card.id)).toEqual([
      'now', 'path', 'stack', 'education', 'languages', 'end-to-end', 'designer-eye', 'motivation',
    ])
    for (const card of cards) {
      expect(card.text.trim()).not.toBe('')
      for (const pattern of PERSONAL_DATA_PATTERNS) expect(card.text).not.toMatch(pattern)
    }
  })

  it('usa los textos aprobados y los datos (sin hechos nuevos)', () => {
    const cv = getCv('en')
    const text = (id: HeroCardId) => buildHeroCards(cv, labels('en')).find((card) => card.id === id)?.text
    expect(text('now')).toBe('Senior Software Engineer · Octane11 · Feb 2022 – Present')
    expect(text('path')).toBe('Frontend & DevOps Engineer (System73, 2016–2022) → Senior Software Engineer (Octane11, 2022–Present)')
    expect(text('languages')).toBe('Spanish C2 · English B2 · Italian B1')
    expect(text('end-to-end')).toBe(cv.endToEnd)
    expect(text('motivation')).toBe(cv.motivation)
  })
})
