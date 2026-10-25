import { z } from 'zod'

/** Fecha con precisión de año (`2014`) o de mes (`2014-03`). */
const PARTIAL_DATE_PATTERN = /^\d{4}(-(0[1-9]|1[0-2]))?$/

export const LOCALES = ['en', 'es'] as const
export type Locale = (typeof LOCALES)[number]

const PartialDate = z.string().regex(PARTIAL_DATE_PATTERN, 'Formato esperado: YYYY o YYYY-MM')
const HttpsUrl = z.url().refine((url) => url.startsWith('https://'), 'La URL debe ser https')
const NonEmptyText = z.string().trim().min(1)
const Id = z.string().regex(/^[a-z0-9-]+$/)

/** `end: null` significa «actualidad». */
const Period = z.object({ start: PartialDate, end: PartialDate.nullable() })

/* ---------- Datos que no dependen del idioma ---------- */

export const ContactLinkSchema = z.object({ label: NonEmptyText, url: HttpsUrl }).strict()

/**
 * Tecnologías de un puesto (no se traducen). `areaId` (id de `skillAreas`) solo hace falta
 * cuando el puesto tuvo varias etapas, como System73 (DevOps y luego Front End).
 */
const TechnologyGroupSchema = z.object({
  areaId: Id.optional(),
  technologies: z.array(NonEmptyText).min(1),
})

const ExperienceFactsSchema = z.object({
  id: Id,
  company: NonEmptyText,
  companyUrl: HttpsUrl,
  period: Period,
  technologyGroups: z.array(TechnologyGroupSchema),
})

const EducationFactsSchema = z.object({
  id: Id,
  institution: NonEmptyText,
  institutionUrl: HttpsUrl,
  period: Period,
})

/** Categorías del filtro de Proyectos (Figma): Nuxt.js · CodePen · Website. */
export const PROJECT_CATEGORIES = ['nuxt', 'codepen', 'website'] as const
export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number]

const ProjectFactsSchema = z.object({
  id: Id,
  url: HttpsUrl,
  image: NonEmptyText,
  category: z.enum(PROJECT_CATEGORIES),
})

const LanguageFactsSchema = z.object({
  id: Id,
  /** Nivel MCER, el mismo que en el PDF. */
  level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
})

const SkillAreaFactsSchema = z.object({
  id: Id,
  periods: z.array(Period).min(1),
  skills: z.array(NonEmptyText).min(1),
})

export const CvFactsSchema = z.object({
  fullName: NonEmptyText,
  resumeUrl: z.string().startsWith('/'),
  contactLinks: z.array(ContactLinkSchema).min(1),
  experience: z.array(ExperienceFactsSchema).min(1),
  education: z.array(EducationFactsSchema).min(1),
  projects: z.array(ProjectFactsSchema).min(1),
  languages: z.array(LanguageFactsSchema).min(1),
  skillAreas: z.array(SkillAreaFactsSchema).min(1),
})

/* ---------- Textos por idioma ---------- */

const ExperienceTextSchema = z.object({
  role: NonEmptyText,
  location: NonEmptyText.optional(),
  summary: NonEmptyText,
  highlights: z.array(NonEmptyText),
})

const EducationTextSchema = z.object({ title: NonEmptyText, description: NonEmptyText.optional() })

const ProjectTextSchema = z.object({
  title: NonEmptyText,
  description: NonEmptyText,
  imageAlt: NonEmptyText,
})

const textsByIdSchema = <T extends z.ZodType>(item: T) => z.record(Id, item)

export const CvTextsSchema = z.object({
  headline: NonEmptyText,
  summary: NonEmptyText,
  /** «Qué me mueve»: frase corta, también para la meta descripción. */
  motivation: NonEmptyText,
  /** Tarjeta «End to end» («In my words»): lleva las palabras clave del stack. */
  endToEnd: NonEmptyText,
  experience: textsByIdSchema(ExperienceTextSchema),
  education: textsByIdSchema(EducationTextSchema),
  projects: textsByIdSchema(ProjectTextSchema),
  languages: textsByIdSchema(NonEmptyText),
  skillAreas: textsByIdSchema(NonEmptyText),
})

/* ---------- CV final (datos + textos de un idioma) ---------- */

export const CvSchema = z.object({
  locale: z.enum(LOCALES),
  fullName: NonEmptyText,
  headline: NonEmptyText,
  summary: NonEmptyText,
  motivation: NonEmptyText,
  endToEnd: NonEmptyText,
  resumeUrl: z.string().startsWith('/'),
  contactLinks: z.array(ContactLinkSchema),
  experience: z.array(
    ExperienceFactsSchema.extend(ExperienceTextSchema.shape),
  ),
  education: z.array(EducationFactsSchema.extend(EducationTextSchema.shape)),
  projects: z.array(ProjectFactsSchema.extend(ProjectTextSchema.shape)),
  languages: z.array(LanguageFactsSchema.extend({ name: NonEmptyText })),
  skillAreas: z.array(SkillAreaFactsSchema.extend({ name: NonEmptyText })),
})

export type CvFacts = z.infer<typeof CvFactsSchema>
export type CvTexts = z.infer<typeof CvTextsSchema>
export type Cv = z.infer<typeof CvSchema>
export type TechnologyGroup = z.infer<typeof TechnologyGroupSchema>
export type ContactLink = z.infer<typeof ContactLinkSchema>
