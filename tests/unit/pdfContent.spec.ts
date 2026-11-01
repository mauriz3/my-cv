import { describe, expect, it } from 'vitest'
import { getCv } from '../../data/cv'
import { LOCALES } from '../../data/schema'
import { buildPdfContent, formatPdfPeriod, PDF_SKILL_ALIASES } from '../../scripts/pdf/content'
import { renderCvHtml } from '../../scripts/pdf/template'

const OCTANE11 = 'octane11'
const ALLOWED_LINK_HOSTS = ['www.linkedin.com', 'github.com', 'codepen.io', 'www.webtelehd.com']
const PERSONAL_DATA_PATTERNS = [/mailto:/i, /tel:/i, /[\w.+-]+@[\w-]+\.[a-z]{2,}/i]

const htmlFor = (locale: (typeof LOCALES)[number]) => renderCvHtml(buildPdfContent(locale), 'cv-print.css')

describe('PDF: mismo texto que la web (fuente única data/cv.*.ts)', () => {
  it.each(LOCALES)('%s: el perfil es el summary de la web seguido de la motivación', (locale) => {
    const cv = getCv(locale)
    const pdf = buildPdfContent(locale)
    expect(pdf.summary).toBe(`${cv.summary} ${cv.motivation}`)
    expect(htmlFor(locale)).toContain(cv.summary)
  })

  it.each(LOCALES)('%s: las viñetas de Octane11 son las de la web', (locale) => {
    const web = getCv(locale).experience.find((job) => job.id === OCTANE11)!
    const pdf = buildPdfContent(locale).experience.find((job) => job.id === OCTANE11)!
    expect(pdf.highlights).toEqual(web.highlights)
    for (const highlight of web.highlights) expect(htmlFor(locale)).toContain(highlight)
  })

  it('lleva los textos acordados (10+ años y stack de Octane11)', () => {
    expect(buildPdfContent('en').summary).toMatch(/^Senior software engineer with a full stack profile and 10\+ years of experience, working mostly on Back End and Front End\./)
    expect(buildPdfContent('es').summary).toMatch(/^Ingeniero de software senior con perfil full stack y más de 10 años de experiencia, centrado sobre todo en Back End y Front End\./)
    expect(buildPdfContent('en').experience[0]!.highlights).toContain('Charts with Chart.js; React, TypeScript, Next.js and Cypress on the Front End.')
    expect(buildPdfContent('es').experience[0]!.highlights).toContain('Gráficas con Chart.js; React, TypeScript, Next.js y Cypress en el Front End.')
  })

  it.each(LOCALES)('%s: puestos, formación, proyectos e idiomas salen de los datos', (locale) => {
    const cv = getCv(locale)
    const pdf = buildPdfContent(locale)
    expect(pdf.experience.map((job) => [job.role, job.summary])).toEqual(cv.experience.map((job) => [job.role, job.summary]))
    expect(pdf.education.map((item) => item.title)).toEqual(cv.education.map((item) => item.title))
    expect(pdf.projects.map((item) => item.description)).toEqual(cv.projects.map((item) => item.description))
    expect(pdf.languages.map((item) => item.name)).toEqual(cv.languages.map((item) => item.name))
  })

  it.each(LOCALES)('%s: skills de los datos, Back End primero, alias ATS y etapa DevOps', (locale) => {
    const pdf = buildPdfContent(locale)
    const webSkills = getCv(locale).skillAreas.flatMap((area) => area.skills).map((skill) => PDF_SKILL_ALIASES[skill] ?? skill)
    expect(pdf.skills.flatMap((group) => group.items).sort()).toEqual(webSkills.sort())
    expect(pdf.skills.map((group) => group.label)).toEqual(['Back End', 'Front End', 'DevOps (2016–2018)'])
    expect(pdf.skills[0]!.items).toContain('REST APIs')
  })

  it('abre la hoja 2 en Open Canarias y acorta la ubicación de System73', () => {
    const pdf = buildPdfContent('en')
    expect(pdf.experience.filter((job) => job.startsNewPage).map((job) => job.id)).toEqual(['open-canarias'])
    expect(pdf.experience.find((job) => job.id === 'system73')!.location).toBe('Tenerife')
  })
})

describe('PDF: privacidad y formato', () => {
  it.each(LOCALES)('%s: sin correo ni teléfono, y solo enlaces públicos', (locale) => {
    const html = htmlFor(locale)
    for (const pattern of PERSONAL_DATA_PATTERNS) expect(html).not.toMatch(pattern)
    const hosts = [...html.matchAll(/href="(https:[^"]+)"/g)].map((match) => new URL(match[1]!).host)
    expect(hosts.length).toBeGreaterThan(0)
    for (const host of hosts) expect(ALLOWED_LINK_HOSTS).toContain(host)
  })

  it('formatea periodos como el diseño', () => {
    expect(formatPdfPeriod({ start: '2022-02', end: null }, 'en')).toBe('Feb 2022 – Present')
    expect(formatPdfPeriod({ start: '2014-03', end: '2014-06' }, 'es')).toBe('mar 2014 – jun 2014')
    expect(formatPdfPeriod({ start: '2014', end: '2014' }, 'es')).toBe('2014')
  })
})
