import { formatPartialDate, type Period } from '../lib/period'
import type { Cv } from './schema'

/** Tarjetas del hero, en el orden del Figma. */
export const HERO_CARD_IDS = [
  'now',
  'path',
  'stack',
  'education',
  'languages',
  'end-to-end',
  'designer-eye',
  'motivation',
] as const
export type HeroCardId = (typeof HERO_CARD_IDS)[number]

export interface HeroCard {
  id: HeroCardId
  label: string
  text: string
}

/** Textos de interfaz que pone la página (vienen de i18n). */
export interface HeroLabels {
  cards: Record<HeroCardId, string>
  present: string
}

const SEPARATOR = ' · '
/** Titulación que resume la formación en el hero. */
const HERO_DEGREE_ID = 'ull-degree'
const BACKEND_AREA_ID = 'backend'
const FRONTEND_AREA_ID = 'frontend'

const yearOf = (partialDate: string) => partialDate.split('-')[0]

function findById<T extends { id: string }>(items: T[], id: string | undefined, block: string): T {
  const item = items.find((candidate) => candidate.id === id)
  if (!item) throw new Error(`Falta ${block}/${id ?? '(primero)'} para el hero`)
  return item
}

/** Construye las 8 tarjetas del hero solo con datos del CV y textos aprobados (nada escrito a mano aquí). */
export function buildHeroCards(cv: Cv, labels: HeroLabels): HeroCard[] {
  const [currentJob, previousJob] = cv.experience
  if (!currentJob || !previousJob) throw new Error('El hero necesita al menos dos puestos')

  const yearsRange = ({ start, end }: Period) => `${yearOf(start)}–${end ? yearOf(end) : labels.present}`
  const degree = findById(cv.education, HERO_DEGREE_ID, 'education')
  const backend = findById(cv.skillAreas, BACKEND_AREA_ID, 'skillAreas')
  const frontend = findById(cv.skillAreas, FRONTEND_AREA_ID, 'skillAreas')
  const currentTechnologies = currentJob.technologyGroups.flatMap((group) => group.technologies)

  const texts: Record<HeroCardId, string> = {
    now: [currentJob.role, currentJob.company, `${formatPartialDate(currentJob.period.start, cv.locale)} – ${labels.present}`].join(SEPARATOR),
    path: `${previousJob.role} (${previousJob.company}, ${yearsRange(previousJob.period)}) → ${currentJob.role} (${currentJob.company}, ${yearsRange(currentJob.period)})`,
    stack: [`${backend.name} + ${frontend.name}`, ...currentTechnologies].join(SEPARATOR),
    education: [degree.title, degree.institution, yearsRange(degree.period)].join(SEPARATOR),
    languages: cv.languages.map((language) => `${language.name} ${language.level}`).join(SEPARATOR),
    'end-to-end': cv.endToEnd,
    'designer-eye': cv.designerEye,
    motivation: cv.motivation,
  }

  return HERO_CARD_IDS.map((id) => ({ id, label: labels.cards[id], text: texts[id] }))
}
