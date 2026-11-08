import { textsEn } from './cv.en'
import { textsEs } from './cv.es'
import { cvFacts } from './cv.shared'
import type { Cv, CvTexts, Locale } from './schema'

const TEXTS_BY_LOCALE: Record<Locale, CvTexts> = { en: textsEn, es: textsEs }

function textFor<T>(texts: Record<string, T>, id: string, locale: Locale, block: string): T {
  const text = texts[id]
  if (text === undefined) throw new Error(`Missing ${locale} text for ${block}/${id}`)
  return text
}

/**
 * Merges shared facts with locale-specific copy.
 * Does not validate with zod so the browser does not download the library; validation runs in
 * `tests/unit/cv.spec.ts` and optionally at build time.
 */
export function getCv(locale: Locale): Cv {
  const texts = TEXTS_BY_LOCALE[locale]

  return {
    locale,
    fullName: cvFacts.fullName,
    headline: texts.headline,
    summary: texts.summary,
    tagline: texts.tagline,
    designerEye: texts.designerEye,
    motivation: texts.motivation,
    endToEnd: texts.endToEnd,
    resumeUrl: cvFacts.resumeUrls[locale],
    contactLinks: cvFacts.contactLinks,
    experience: cvFacts.experience.map((item) => ({
      ...item,
      ...textFor(texts.experience, item.id, locale, 'experience'),
    })),
    education: cvFacts.education.map((item) => ({
      ...item,
      ...textFor(texts.education, item.id, locale, 'education'),
    })),
    certifications: cvFacts.certifications,
    projects: cvFacts.projects.map((item) => ({
      ...item,
      ...textFor(texts.projects, item.id, locale, 'projects'),
    })),
    languages: cvFacts.languages.map((item) => ({
      ...item,
      name: textFor(texts.languages, item.id, locale, 'languages'),
    })),
    books: cvFacts.books.map((item) => ({
      ...item,
      ...textFor(texts.books, item.id, locale, 'books'),
    })),
    skillAreas: cvFacts.skillAreas.map((item) => ({
      ...item,
      name: textFor(texts.skillAreas, item.id, locale, 'skillAreas'),
    })),
    skillProfile: cvFacts.skillProfile.map((axis) => ({
      ...axis,
      label: textFor(texts.skillProfile, axis.id, locale, 'skillProfile'),
    })),
  }
}
