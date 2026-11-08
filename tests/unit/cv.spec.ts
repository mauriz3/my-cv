import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getCv } from '../../data/cv'
import { cvFacts } from '../../data/cv.shared'
import { textsEn } from '../../data/cv.en'
import { textsEs } from '../../data/cv.es'
import { CvFactsSchema, CvSchema, CvTextsSchema, LOCALES, MAX_SKILL_LEVEL, PROJECT_CATEGORIES } from '../../data/schema'
import { formatPartialDate, isSingleDate } from '../../lib/period'
import { monthsInPeriod, toMonthIndex, yearsInPeriods } from '../../lib/years'

const ALLOWED_CONTACT_HOSTS = ['www.linkedin.com', 'github.com', 'codepen.io']
const GENERIC_ALT_TEXTS = ['image', 'imagen', 'img', 'photo', 'foto', 'screenshot', 'captura']
const PERSONAL_DATA_PATTERNS = [/@/, /mailto:/i, /tel:/i, /\+?\d[\d\s().-]{8,}\d/]
const MAX_AREA_YEARS = 50
const MAX_MOTIVATION_CHARS = 220
const HISTORICAL_ONLY_SKILL = 'AWS'
const END_TO_END_KEYWORDS = ['Node', 'React', 'Vue']

const byIdSorted = (ids: string[]) => [...ids].sort()
const textBlocks = [
  { name: 'en', texts: textsEn },
  { name: 'es', texts: textsEs },
]

/** All visible CV strings for a locale, to search for personal data. */
function visibleStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(visibleStrings)
  if (value && typeof value === 'object') return Object.values(value).flatMap(visibleStrings)
  return []
}

describe('schemas', () => {
  it('shared facts satisfy schema', () => {
    expect(() => CvFactsSchema.parse(cvFacts)).not.toThrow()
  })

  it.each(textBlocks)('«$name» texts satisfy schema', ({ texts }) => {
    expect(() => CvTextsSchema.parse(texts)).not.toThrow()
  })

  it.each(LOCALES)('getCv(%s) returns a valid CV', (locale) => {
    expect(CvSchema.parse(getCv(locale)).locale).toBe(locale)
  })
})

describe('locales', () => {
  it.each(textBlocks)('«$name» has text for every id and no extras', ({ texts }) => {
    expect(byIdSorted(Object.keys(texts.experience))).toEqual(byIdSorted(cvFacts.experience.map((e) => e.id)))
    expect(byIdSorted(Object.keys(texts.education))).toEqual(byIdSorted(cvFacts.education.map((e) => e.id)))
    expect(byIdSorted(Object.keys(texts.projects))).toEqual(byIdSorted(cvFacts.projects.map((p) => p.id)))
    expect(byIdSorted(Object.keys(texts.languages))).toEqual(byIdSorted(cvFacts.languages.map((l) => l.id)))
    expect(byIdSorted(Object.keys(texts.books))).toEqual(byIdSorted(cvFacts.books.map((b) => b.id)))
    expect(byIdSorted(Object.keys(texts.skillAreas))).toEqual(byIdSorted(cvFacts.skillAreas.map((a) => a.id)))
  })

  it('ids do not repeat within each block', () => {
    const blocks = [cvFacts.experience, cvFacts.education, cvFacts.projects, cvFacts.books, cvFacts.skillAreas]
    for (const block of blocks) {
      const ids = block.map((item) => item.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})

describe('dates', () => {
  it('each period ends in the same month or later than start', () => {
    const periods = [...cvFacts.experience, ...cvFacts.education].map((item) => item.period)
    for (const { start, end } of periods) {
      if (end !== null) expect(toMonthIndex(end)).toBeGreaterThanOrEqual(toMonthIndex(start))
    }
  })

  it('experience runs newest to oldest', () => {
    const starts = cvFacts.experience.map((item) => toMonthIndex(item.period.start))
    expect(starts).toEqual([...starts].sort((a, b) => b - a))
  })

  it('only current role (Octane11) is open; System73 is no longer «current»', () => {
    const open = cvFacts.experience.filter((item) => item.period.end === null).map((item) => item.id)
    expect(open).toEqual(['octane11'])
    expect(cvFacts.experience.find((item) => item.id === 'system73')?.period.end).toBe('2022-02')
  })
})

describe('links and images', () => {
  it('contact is only LinkedIn, GitHub, and CodePen, no duplicates', () => {
    const hosts = cvFacts.contactLinks.map((link) => new URL(link.url).host)
    expect(byIdSorted(hosts)).toEqual(byIdSorted(ALLOWED_CONTACT_HOSTS))
  })

  it.each(LOCALES)('«%s»: each image alt text is descriptive', (locale) => {
    const cv = getCv(locale)
    for (const alt of [...cv.projects.map((p) => p.imageAlt), ...cv.books.map((b) => b.coverAlt)]) {
      const normalized = alt.trim().toLowerCase()
      expect(GENERIC_ALT_TEXTS).not.toContain(normalized)
      expect(normalized.split(/\s+/).length).toBeGreaterThanOrEqual(3)
    }
  })
})

describe('personal data', () => {
  it.each(LOCALES)('«%s» has no email, phone, or address', (locale) => {
    const cv = getCv(locale)
    const texts = visibleStrings({ ...cv, contactLinks: undefined, resumeUrl: undefined })
    for (const text of texts) {
      for (const pattern of PERSONAL_DATA_PATTERNS) {
        expect(text, `«${text}» matches ${pattern}`).not.toMatch(pattern)
      }
    }
  })
})

describe('skills', () => {
  const allSkills = cvFacts.skillAreas.flatMap((area) => area.skills)
  const REQUIRED_SKILLS = ['React', 'Next.js', 'TypeScript', 'Chart.js', 'Cypress', 'Node.js']

  it('includes current Octane11 skills', () => {
    expect(allSkills).toEqual(expect.arrayContaining(REQUIRED_SKILLS))
  })

  it('does not include Jenkins', () => {
    expect(allSkills).not.toContain('Jenkins')
  })

  it('AWS is not a skill or in knowsAbout (EN/ES): only in System73 history', () => {
    for (const locale of LOCALES) {
      const cv = getCv(locale)
      expect(cv.skillAreas.flatMap((area) => area.skills)).not.toContain(HISTORICAL_ONLY_SKILL)
      const technologiesOf = (jobs: typeof cv.experience) =>
        jobs.flatMap((job) => job.technologyGroups.flatMap((group) => group.technologies))
      expect(technologiesOf(cv.experience.filter((job) => job.id === 'system73'))).toContain(HISTORICAL_ONLY_SKILL)
      expect(technologiesOf(cv.experience.filter((job) => job.id !== 'system73'))).not.toContain(HISTORICAL_ONLY_SKILL)
    }
    for (const { texts } of textBlocks) {
      const { system73, ...otherJobs } = texts.experience
      expect(JSON.stringify(system73)).toContain(HISTORICAL_ONLY_SKILL)
      expect(JSON.stringify(otherJobs)).not.toContain(HISTORICAL_ONLY_SKILL)
    }
  })

  const skillsOf = (areaId: string) => cvFacts.skillAreas.find((area) => area.id === areaId)?.skills ?? []

  it('Back End only has Octane11 stack: Node.js, REST APIs, and Prisma', () => {
    expect(skillsOf('backend')).toEqual(['Node.js', 'REST APIs', 'Prisma'])
  })

  it('Python is in DevOps (System73) and Django in Front End', () => {
    expect(skillsOf('devops')).toContain('Python')
    expect(skillsOf('frontend')).toContain('Django')
    expect(skillsOf('backend')).not.toContain('Python')
    expect(skillsOf('backend')).not.toContain('Django')
  })

  it('backend starts at Octane11 (Feb 2022)', () => {
    const backend = cvFacts.skillAreas.find((area) => area.id === 'backend')
    expect(backend?.periods).toEqual([{ start: '2022-02', end: null }])
  })
})

describe('languages confirmed by Maurizio', () => {
  it('Español C2 · Inglés B2 · Italiano B1, same as PDF', () => {
    expect(cvFacts.languages).toEqual([
      { id: 'spanish', level: 'C2' },
      { id: 'english', level: 'B2' },
      { id: 'italian', level: 'B1' },
    ])
  })
})

describe('technologies per role', () => {
  const areaIds = cvFacts.skillAreas.map((area) => area.id)

  it.each(cvFacts.experience)('«$id»: non-empty chips, no duplicates or personal data', ({ technologyGroups }) => {
    const technologies = technologyGroups.flatMap((group) => group.technologies)
    expect(new Set(technologies).size).toBe(technologies.length)
    for (const technology of technologies) {
      expect(technology.trim()).not.toBe('')
      for (const pattern of PERSONAL_DATA_PATTERNS) expect(technology).not.toMatch(pattern)
    }
  })

  it('groups by area point at existing areas', () => {
    for (const { technologyGroups } of cvFacts.experience) {
      for (const { areaId } of technologyGroups) if (areaId) expect(areaIds).toContain(areaId)
    }
  })

  it('System73 groups DevOps (with Jenkins, historical) and Front End', () => {
    const system73 = cvFacts.experience.find((job) => job.id === 'system73')
    expect(system73?.technologyGroups.map((group) => group.areaId)).toEqual(['devops', 'frontend'])
    expect(system73?.technologyGroups[0]?.technologies).toContain('Jenkins')
  })

  it('Octane11 includes Prisma', () => {
    const octane11 = cvFacts.experience.find((job) => job.id === 'octane11')
    expect(octane11?.technologyGroups.flatMap((group) => group.technologies)).toContain('Prisma')
  })

  it('Hospital has no chips', () => {
    expect(cvFacts.experience.find((job) => job.id === 'huc')?.technologyGroups).toEqual([])
  })
})

describe('certifications', () => {
  it('includes «Accelerated ES6 JavaScript Training» (no issuer or date: not in source)', () => {
    expect(cvFacts.certifications).toEqual([{ id: 'accelerated-es6', name: 'Accelerated ES6 JavaScript Training' }])
  })
})

describe('locations', () => {
  it.each(textBlocks)('«$name»: System73 is in San Cristóbal de La Laguna (Tenerife)', ({ texts }) => {
    expect(texts.experience.system73?.location).toBe('San Cristóbal de La Laguna (Tenerife)')
  })
})

describe('areas confirmed by Maurizio', () => {
  const periodsOf = (areaId: string) => cvFacts.skillAreas.find((area) => area.id === areaId)?.periods

  it('DevOps spans 2 years (Feb 2016 – Jan 2018) and Front End starts right after', () => {
    expect(periodsOf('devops')).toEqual([{ start: '2016-02', end: '2018-02' }])
    expect(periodsOf('frontend')).toEqual([{ start: '2018-02', end: null }])
  })
})

describe('motivation and «End to end»', () => {
  it.each(LOCALES)('«%s»: motivation is a short non-empty phrase', (locale) => {
    const { motivation } = getCv(locale)
    expect(motivation.trim()).not.toBe('')
    expect(motivation.length).toBeLessThanOrEqual(MAX_MOTIVATION_CHARS)
  })

  it.each(LOCALES)('«%s»: «End to end» card names the real stack', (locale) => {
    const { endToEnd } = getCv(locale)
    for (const keyword of END_TO_END_KEYWORDS) expect(endToEnd).toContain(keyword)
  })
})

describe('years per area', () => {
  const now = new Date(2026, 9, 24) // 24 Oct 2026

  it('computes months for closed and open periods', () => {
    expect(monthsInPeriod({ start: '2016-02', end: '2018-02' }, now)).toBe(24)
    expect(monthsInPeriod({ start: '2022-02', end: null }, now)).toBe(56)
  })

  it('sums several periods with one decimal', () => {
    const periods = [
      { start: '2016-02', end: '2018-02' },
      { start: '2022-02', end: '2023-02' },
    ]
    expect(yearsInPeriods(periods, now)).toBe(3)
  })

  it('frontend and backend outweigh DevOps', () => {
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

describe('dates by locale', () => {
  it('formats month and year in English and Spanish', () => {
    expect(formatPartialDate('2022-02', 'en')).toBe('Feb 2022')
    expect(formatPartialDate('2022-02', 'es')).toBe('feb 2022')
  })

  it('year-only date shows as year', () => {
    expect(formatPartialDate('2014', 'en')).toBe('2014')
  })

  it('detects single-date periods', () => {
    expect(isSingleDate({ start: '2014', end: '2014' })).toBe(true)
    expect(isSingleDate({ start: '2010', end: '2014' })).toBe(false)
    expect(isSingleDate({ start: '2022-02', end: null })).toBe(false)
  })
})

describe('projects', () => {
  it('there are 6: no «Responsive YouTube» or «Status lights» (Maurizio decision)', () => {
    const ids = cvFacts.projects.map((project) => project.id)
    expect(ids).toHaveLength(6)
    expect(ids).not.toContain('responsive-youtube')
    expect(ids).not.toContain('status-lights')
  })
})

describe('project filter', () => {
  it('each filter category (Nuxt.js · CodePen · Website) has at least one project', () => {
    for (const category of PROJECT_CATEGORIES) {
      expect(cvFacts.projects.some((project) => project.category === category)).toBe(true)
    }
  })
})

describe('«Skill profile» radar', () => {
  /** Figma order: first axis up, then clockwise. */
  const RADAR_AXIS_IDS = ['frontend', 'backend', 'apis-data', 'ci-cd', 'testing', 'ux-ui']

  it('has six Figma axes in order without duplicate ids', () => {
    const ids = cvFacts.skillProfile.map((axis) => axis.id)
    expect(ids).toEqual(RADAR_AXIS_IDS)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('levels are relative values between 0 and MAX_SKILL_LEVEL', () => {
    for (const { level } of cvFacts.skillProfile) {
      expect(level).toBeGreaterThanOrEqual(0)
      expect(level).toBeLessThanOrEqual(MAX_SKILL_LEVEL)
    }
  })

  it.each(textBlocks)('«$name»: each axis has a label and none contain digits', ({ texts }) => {
    expect(byIdSorted(Object.keys(texts.skillProfile))).toEqual(byIdSorted(RADAR_AXIS_IDS))
    for (const label of Object.values(texts.skillProfile)) expect(label).not.toMatch(/\d/)
  })

  it('SkillChart does not render numbers: no ticks, tooltip, or events', () => {
    const source = readFileSync(new URL('../../app/components/SkillChart.vue', import.meta.url), 'utf8')
    expect(source).toMatch(/ticks:\s*\{\s*display:\s*false\s*\}/)
    expect(source).toMatch(/events:\s*\[\]/)
    expect(source).not.toMatch(/Tooltip|Legend/)
  })
})
