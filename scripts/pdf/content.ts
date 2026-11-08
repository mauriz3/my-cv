/**
 * PDF CV content (EN / ES) in reading order, built from `data/cv.*.ts` via `getCv`:
 * CV copy (summary, roles, bullets, education, projects, skills) has a single source.
 * Only PDF-specific presentation lives here: section titles, footer, block order,
 * ATS skill aliases, page break, and a shortened location.
 * Privacy: public links only (LinkedIn, GitHub, CodePen). Never email, phone, or address.
 */
import { getCv } from '../../data/cv'
import type { Cv, Locale } from '../../data/schema'

export interface PdfPeriod {
  start: string
  end: string | null
}

export interface PdfLink {
  label: string
  url: string
  /** Visible text: URL without `https://`, `www.`, or trailing slash (Handoff – CV PDF). */
  text: string
}

export interface PdfExperience {
  id: string
  role: string
  company: string
  location?: string
  period: PdfPeriod
  summary: string
  highlights: string[]
  startsNewPage: boolean
}

export interface PdfEducation {
  title: string
  institution: string
  period: PdfPeriod
  description?: string
}

export interface PdfContent {
  lang: Locale
  fullName: string
  documentTitle: string
  subject: string
  footer: { prefix: string; of: string }
  headline: string
  contactLinks: PdfLink[]
  headings: Record<'summary' | 'experience' | 'education' | 'certifications' | 'skills' | 'languages' | 'projects', string>
  summary: string
  experience: PdfExperience[]
  education: PdfEducation[]
  certifications: string[]
  skills: { label: string; items: string[] }[]
  languages: { name: string; level: string }[]
  projects: (PdfLink & { title: string; description: string })[]
}

const PERIOD_SEPARATOR = ' – ' // en dash U+2013 with spaces
const YEAR_RANGE_SEPARATOR = '–'
const MONTHS: Record<Locale, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
}
const PRESENT: Record<Locale, string> = { en: 'Present', es: 'actualidad' }

/** PDF-only labels (not CV content). */
const PDF_LABELS: Record<Locale, Pick<PdfContent, 'subject' | 'footer' | 'headings'>> = {
  en: {
    subject: 'Senior Software Engineer · Full stack',
    footer: { prefix: 'Maurizio Rendon · CV · Page', of: 'of' },
    headings: {
      summary: 'Summary', experience: 'Experience', education: 'Education', certifications: 'Certifications',
      skills: 'Skills', languages: 'Languages', projects: 'Projects',
    },
  },
  es: {
    subject: 'Senior Software Engineer · Full stack',
    footer: { prefix: 'Maurizio Rendon · CV · Página', of: 'de' },
    headings: {
      summary: 'Perfil', experience: 'Experiencia', education: 'Formación', certifications: 'Certificaciones',
      skills: 'Habilidades', languages: 'Idiomas', projects: 'Proyectos',
    },
  },
}

/** Order of links in the PDF design header. */
export const PDF_CONTACT_ORDER = ['LinkedIn', 'GitHub', 'CodePen']
/** Order of Skills rows in the PDF: Back End first. */
export const PDF_SKILL_AREA_ORDER = ['backend', 'frontend', 'devops']
/** Names with aliases for exact ATS searches (the site shows the short name). */
export const PDF_SKILL_ALIASES: Readonly<Record<string, string>> = { React: 'React (ReactJS)', 'Chart.js': 'Chart.js (ChartJS)' }
/** The PDF shortens location so the System73 line fits on one row. */
export const PDF_LOCATION_OVERRIDES: Readonly<Record<string, string>> = { system73: 'Tenerife' }
/** Role that starts sheet 2 (no entry splits across pages). */
export const PDF_PAGE_BREAK_BEFORE = 'open-canarias'

export const visibleUrl = (url: string): string => url.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '')

function formatPartialDate(partialDate: string, locale: Locale): string {
  const [year, month] = partialDate.split('-')
  return month ? `${MONTHS[locale][Number(month) - 1]} ${year}` : String(year)
}

/** «Feb 2022 – Present», «2014» (same date), or «Mar 2014 – Jun 2014». */
export function formatPdfPeriod({ start, end }: PdfPeriod, locale: Locale): string {
  const startText = formatPartialDate(start, locale)
  if (end === start) return startText
  const endText = end === null ? PRESENT[locale] : formatPartialDate(end, locale)
  return `${startText}${PERIOD_SEPARATOR}${endText}`
}

const yearOf = (partialDate: string) => partialDate.slice(0, 4)

/** «DevOps (2016–2018)» if the area ended; «Back End» if still active. */
function skillAreaLabel(area: Cv['skillAreas'][number]): string {
  const ended = area.periods.every((period) => period.end !== null)
  if (!ended) return area.name
  const first = area.periods[0]!
  const last = area.periods[area.periods.length - 1]!
  return `${area.name} (${yearOf(first.start)}${YEAR_RANGE_SEPARATOR}${yearOf(last.end!)})`
}

function byOrder<T>(items: T[], keyOf: (item: T) => string, order: string[]): T[] {
  const rank = (item: T) => {
    const index = order.indexOf(keyOf(item))
    return index === -1 ? order.length : index
  }
  return [...items].sort((a, b) => rank(a) - rank(b))
}

/** PDF profile = site summary + motivation sentence (separate on the site). */
export function pdfSummary(cv: Pick<Cv, 'summary' | 'motivation'>): string {
  return `${cv.summary} ${cv.motivation}`
}

export function buildPdfContent(locale: Locale): PdfContent {
  const cv = getCv(locale)
  return {
    lang: locale,
    fullName: cv.fullName,
    documentTitle: `${cv.fullName} – CV`,
    ...PDF_LABELS[locale],
    headline: cv.headline,
    contactLinks: byOrder(cv.contactLinks, (link) => link.label, PDF_CONTACT_ORDER).map((link) => ({
      ...link,
      text: visibleUrl(link.url),
    })),
    summary: pdfSummary(cv),
    experience: cv.experience.map((job) => ({
      id: job.id,
      role: job.role,
      company: job.company,
      location: PDF_LOCATION_OVERRIDES[job.id] ?? job.location,
      period: job.period,
      summary: job.summary,
      highlights: job.highlights,
      startsNewPage: job.id === PDF_PAGE_BREAK_BEFORE,
    })),
    education: cv.education.map((item) => ({
      title: item.title,
      institution: item.institution,
      period: item.period,
      description: item.description,
    })),
    certifications: cv.certifications.map((certification) => certification.name),
    skills: byOrder(cv.skillAreas, (area) => area.id, PDF_SKILL_AREA_ORDER).map((area) => ({
      label: skillAreaLabel(area),
      items: area.skills.map((skill) => PDF_SKILL_ALIASES[skill] ?? skill),
    })),
    languages: cv.languages.map((language) => ({ name: language.name, level: language.level })),
    projects: cv.projects.map((item) => ({
      label: item.title,
      title: item.title,
      description: item.description,
      url: item.url,
      text: visibleUrl(item.url),
    })),
  }
}
