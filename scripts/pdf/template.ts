/** HTML semántico de una columna (h1/h2/h3, listas) para imprimir el CV con Chromium. */
import { formatPdfPeriod, type PdfContent, type PdfLink, type PdfPeriod } from './content'

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]!)
const META_SEPARATOR = ' · '
const PROJECT_SEPARATOR = ' — '

const renderLink = ({ url, text }: Pick<PdfLink, 'url' | 'text'>) => `<a href="${escapeHtml(url)}">${escapeHtml(text)}</a>`

const renderSection = (id: string, title: string, body: string, { compact = false } = {}) => `
  <section class="cv-section${compact ? ' cv-section--compact' : ''} cv-${id}" aria-labelledby="${id}">
    <h2 class="cv-section-title" id="${id}">${escapeHtml(title)}</h2>
    ${body}
  </section>`

const renderHeader = (content: PdfContent) => `
  <header class="cv-header">
    <h1 class="cv-name">${escapeHtml(content.fullName)}</h1>
    <p class="cv-headline">${escapeHtml(content.headline)}</p>
    <ul class="cv-links">
      ${content.contactLinks.map((contact) => `<li>${escapeHtml(contact.label)}: ${renderLink(contact)}</li>`).join('')}
    </ul>
  </header>`

/** Línea «Empresa · lugar · fechas»; omite las partes que no existan. */
const renderMeta = (organization: string, location: string | undefined, period: PdfPeriod, content: PdfContent) => {
  const parts = [`<span class="cv-org">${escapeHtml(organization)}</span>`]
  if (location) parts.push(escapeHtml(location))
  parts.push(`<span class="cv-period">${formatPdfPeriod(period, content.lang)}</span>`)
  return `<p class="cv-meta">${parts.join(META_SEPARATOR)}</p>`
}

const renderList = (items: string[]) =>
  items.length ? `<ul class="cv-highlights">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''

const renderExperience = (content: PdfContent) => content.experience.map((job) => `
  <article class="cv-entry${job.startsNewPage ? ' cv-entry--new-page' : ''}">
    <h3 class="cv-entry-title">${escapeHtml(job.role)}</h3>
    ${renderMeta(job.company, job.location, job.period, content)}
    <p class="cv-entry-summary">${escapeHtml(job.summary)}</p>
    ${renderList(job.highlights)}
  </article>`).join('')

const renderEducation = (content: PdfContent) => content.education.map((item) => `
  <article class="cv-entry">
    <h3 class="cv-entry-title">${escapeHtml(item.title)}</h3>
    ${renderMeta(item.institution, undefined, item.period, content)}
    ${item.description ? `<p class="cv-entry-summary">${escapeHtml(item.description)}</p>` : ''}
  </article>`).join('')

const renderCertifications = (content: PdfContent) => content.certifications.map((name) =>
  `<article class="cv-entry"><h3 class="cv-entry-title">${escapeHtml(name)}</h3></article>`).join('')

const renderSkills = (content: PdfContent) => content.skills.map((group) =>
  `<p class="cv-row"><span class="cv-row-label">${escapeHtml(group.label)}:</span> ${group.items.map((item) => `<span class="cv-skill">${escapeHtml(item)}</span>`).join(', ')}</p>`).join('')

const renderLanguages = (content: PdfContent) =>
  `<p class="cv-row">${content.languages.map((language) => `${escapeHtml(language.name)} ${escapeHtml(language.level)}`).join(META_SEPARATOR)}</p>`

const renderProjects = (content: PdfContent) => content.projects.map((item) =>
  `<p class="cv-row"><span class="cv-row-label">${escapeHtml(item.title)}</span>${PROJECT_SEPARATOR}${escapeHtml(item.description)} ${renderLink(item)}</p>`).join('')

/** Pie «Maurizio Rendon · CV · Page X of Y» con márgenes de @page (Chrome ≥ 131). */
const renderFooterStyle = ({ footer }: PdfContent) => `
  <style>
    @page { @bottom-center {
      content: "${escapeHtml(footer.prefix)} " counter(page) " ${escapeHtml(footer.of)} " counter(pages);
      font: 400 8pt/1.3 'CV Inter', sans-serif; color: #57606A;
    } }
  </style>`

/** `stylesheetHref`: URL del CSS de impresión (las fuentes se resuelven relativas a él). */
export function renderCvHtml(content: PdfContent, stylesheetHref: string): string {
  const { headings } = content
  return `<!doctype html>
<html lang="${content.lang}">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(content.documentTitle)}</title>
  <link rel="stylesheet" href="${escapeHtml(stylesheetHref)}">
  ${renderFooterStyle(content)}
</head>
<body>
  <main>
    ${renderHeader(content)}
    ${renderSection('summary', headings.summary, `<p>${escapeHtml(content.summary)}</p>`)}
    ${renderSection('experience', headings.experience, renderExperience(content))}
    ${renderSection('education', headings.education, renderEducation(content))}
    ${renderSection('certifications', headings.certifications, renderCertifications(content), { compact: true })}
    ${renderSection('skills', headings.skills, renderSkills(content), { compact: true })}
    ${renderSection('languages', headings.languages, renderLanguages(content), { compact: true })}
    ${renderSection('projects', headings.projects, renderProjects(content))}
  </main>
</body>
</html>`
}
