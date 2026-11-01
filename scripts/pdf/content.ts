/**
 * Contenido del CV en PDF (EN / ES) en orden de lectura, construido desde `data/cv.*.ts` con `getCv`:
 * los textos del CV (summary, puestos, viñetas, formación, proyectos, skills) tienen una sola fuente.
 * Aquí solo vive la presentación propia del PDF: títulos de sección, pie, orden de bloques,
 * alias de skills para ATS, salto de hoja y una ubicación acortada.
 * Privacidad: solo enlaces públicos (LinkedIn, GitHub, CodePen). Nunca correo, teléfono ni dirección.
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
  /** Texto visible: la URL sin `https://`, `www.` ni barra final (Handoff – CV PDF). */
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

const PERIOD_SEPARATOR = ' – ' // raya corta U+2013 con espacios
const YEAR_RANGE_SEPARATOR = '–'
const MONTHS: Record<Locale, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
}
const PRESENT: Record<Locale, string> = { en: 'Present', es: 'actualidad' }

/** Textos propios del PDF (no son contenido del CV). */
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

/** Orden de los enlaces en la cabecera del diseño del PDF. */
export const PDF_CONTACT_ORDER = ['LinkedIn', 'GitHub', 'CodePen']
/** Orden de las filas de Skills en el PDF: Back End primero. */
export const PDF_SKILL_AREA_ORDER = ['backend', 'frontend', 'devops']
/** Nombres con alias para búsquedas exactas de ATS (la web muestra el nombre corto). */
export const PDF_SKILL_ALIASES: Readonly<Record<string, string>> = { React: 'React (ReactJS)', 'Chart.js': 'Chart.js (ChartJS)' }
/** El PDF acorta la ubicación para que la línea de System73 quepa en una línea. */
export const PDF_LOCATION_OVERRIDES: Readonly<Record<string, string>> = { system73: 'Tenerife' }
/** Puesto que abre la hoja 2 (ninguna entrada se parte entre hojas). */
export const PDF_PAGE_BREAK_BEFORE = 'open-canarias'

export const visibleUrl = (url: string): string => url.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '')

function formatPartialDate(partialDate: string, locale: Locale): string {
  const [year, month] = partialDate.split('-')
  return month ? `${MONTHS[locale][Number(month) - 1]} ${year}` : String(year)
}

/** «Feb 2022 – Present», «2014» (misma fecha) o «mar 2014 – jun 2014». */
export function formatPdfPeriod({ start, end }: PdfPeriod, locale: Locale): string {
  const startText = formatPartialDate(start, locale)
  if (end === start) return startText
  const endText = end === null ? PRESENT[locale] : formatPartialDate(end, locale)
  return `${startText}${PERIOD_SEPARATOR}${endText}`
}

const yearOf = (partialDate: string) => partialDate.slice(0, 4)

/** «DevOps (2016–2018)» si el área ya terminó; «Back End» si sigue activa. */
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

/** Perfil del PDF = summary de la web + la frase de motivación (que en la web va aparte). */
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
