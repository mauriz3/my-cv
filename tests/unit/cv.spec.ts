import { describe, expect, it } from 'vitest'
import { getCv } from '../../data/cv'
import { cvFacts } from '../../data/cv.shared'
import { textsEn } from '../../data/cv.en'
import { textsEs } from '../../data/cv.es'
import { CvFactsSchema, CvSchema, CvTextsSchema, LOCALES } from '../../data/schema'
import { monthsInPeriod, toMonthIndex, yearsInPeriods } from '../../lib/years'

const ALLOWED_CONTACT_HOSTS = ['www.linkedin.com', 'github.com', 'codepen.io']
const GENERIC_ALT_TEXTS = ['image', 'imagen', 'img', 'photo', 'foto', 'screenshot', 'captura']
const PERSONAL_DATA_PATTERNS = [/@/, /mailto:/i, /tel:/i, /\+?\d[\d\s().-]{8,}\d/]
const MAX_AREA_YEARS = 50
const MAX_MOTIVATION_CHARS = 220
const MOTIVATION_KEYWORDS = ['Node', 'API', 'React', 'Vue']

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

  it('el backend empieza en Octane11 (feb 2022)', () => {
    const backend = cvFacts.skillAreas.find((area) => area.id === 'backend')
    expect(backend?.periods).toEqual([{ start: '2022-02', end: null }])
  })
})

describe('áreas confirmadas por Maurizio', () => {
  const periodsOf = (areaId: string) => cvFacts.skillAreas.find((area) => area.id === areaId)?.periods

  it('DevOps dura 2 años (feb 2016 – ene 2018) y Frontend empieza justo después', () => {
    expect(periodsOf('devops')).toEqual([{ start: '2016-02', end: '2018-02' }])
    expect(periodsOf('frontend')).toEqual([{ start: '2018-02', end: null }])
  })
})

describe('motivación', () => {
  it.each(LOCALES)('«%s» tiene una frase corta con palabras clave reales', (locale) => {
    const { motivation } = getCv(locale)
    expect(motivation.length).toBeLessThanOrEqual(MAX_MOTIVATION_CHARS)
    for (const keyword of MOTIVATION_KEYWORDS) expect(motivation).toContain(keyword)
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
