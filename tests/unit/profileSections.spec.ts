import { describe, expect, it } from 'vitest'
import { cvFacts } from '../../data/cv.shared'
import en from '../../i18n/locales/en.json'
import es from '../../i18n/locales/es.json'
import {
  BADGE_MS,
  BODY_DELAY_MS,
  BODY_MS,
  CEFR_LEVELS,
  CEFR_STEP_COUNT,
  LANGUAGE_CARD_MS,
  PROFILE_REVEAL_THRESHOLD,
  QUOTE_BAR_MS,
  QUOTE_TEXT_DELAY_MS,
  QUOTE_TEXT_MS,
  RESULT_MS,
  ROCKET_DELAY_MS,
  ROCKET_MS,
  SEGMENT_MS,
  SIGN_MS,
  TERM_MS,
  badgeDelayMs,
  enterVars,
  filledStepCount,
  isCurrentStep,
  isFilledStep,
  languageCardDelayMs,
  languageFraction,
  resultBarDelayMs,
  segmentDelayMs,
  signDelayMs,
  termDelayMs,
  type CefrLevel,
} from '../../lib/profileSections'

describe('CEFR scale', () => {
  it('fills one more step per level, up to 6 of 6', () => {
    const filled = CEFR_LEVELS.map((level) => filledStepCount(level))
    expect(filled).toEqual([1, 2, 3, 4, 5, 6])
    expect(CEFR_STEP_COUNT).toBe(6)
  })

  it('marks only steps below the level as filled, and the level itself as current', () => {
    const level: CefrLevel = 'B1'
    expect(CEFR_LEVELS.map((_, index) => isFilledStep(level, index))).toEqual([true, true, true, false, false, false])
    expect(isFilledStep(level, -1)).toBe(false)
    expect(isCurrentStep(level, 2)).toBe(true)
    expect(isCurrentStep(level, 1)).toBe(false)
  })

  it('formats the fraction used on the card', () => {
    expect(languageFraction('C2')).toBe('6/6')
    expect(languageFraction('B2')).toBe('4/6')
    expect(languageFraction('B1')).toBe('3/6')
  })
})

describe('about entrance', () => {
  it('uses the shared 20% reveal threshold', () => {
    expect(PROFILE_REVEAL_THRESHOLD).toBe(0.2)
  })

  it('quotes the bar first, then the sentence, then the paragraph', () => {
    expect(enterVars(0, QUOTE_BAR_MS)).toEqual({ '--enter-delay': '0ms', '--enter-ms': '560ms' })
    expect(enterVars(QUOTE_TEXT_DELAY_MS, QUOTE_TEXT_MS)).toEqual({ '--enter-delay': '160ms', '--enter-ms': '560ms' })
    expect(enterVars(BODY_DELAY_MS, BODY_MS)).toEqual({ '--enter-delay': '320ms', '--enter-ms': '520ms' })
  })

  it('staggers the three terms, the signs, the bars, and the rocket', () => {
    expect([0, 1, 2].map(termDelayMs)).toEqual([80, 220, 360])
    expect(termDelayMs(-1)).toBe(80)
    expect(TERM_MS).toBe(420)

    expect([0, 1, 2].map(signDelayMs)).toEqual([180, 320, 460])
    expect(signDelayMs(9)).toBe(460)
    expect(SIGN_MS).toBe(320)

    expect([0, 1, 2].map(resultBarDelayMs)).toEqual([520, 610, 700])
    expect(resultBarDelayMs(-2)).toBe(520)
    expect(RESULT_MS).toBe(480)

    expect(enterVars(ROCKET_DELAY_MS, ROCKET_MS)).toEqual({ '--enter-delay': '760ms', '--enter-ms': '560ms' })
  })
})

describe('language entrance', () => {
  it('staggers cards, filled steps, and the badge after the last filled step', () => {
    expect([0, 1, 2].map(languageCardDelayMs)).toEqual([0, 90, 180])
    expect(languageCardDelayMs(-1)).toBe(0)
    expect(LANGUAGE_CARD_MS).toBe(320)

    expect(segmentDelayMs(1, 3)).toBe(140 + 90 + 55 * 3)
    expect(segmentDelayMs(-1, -4)).toBe(140)
    expect(SEGMENT_MS).toBe(220)

    expect(badgeDelayMs(0, 6)).toBe(220 + 55 * 5)
    expect(badgeDelayMs(2, 3)).toBe(220 + 180 + 55 * 2)
    expect(badgeDelayMs(0, 0)).toBe(220)
    expect(BADGE_MS).toBe(260)
  })
})

describe('profile copy', () => {
  it('has usage text for every language, in both locales', () => {
    const ids = cvFacts.languages.map((language) => language.id).sort()
    expect(Object.keys(en.profile.languageUse).sort()).toEqual(ids)
    expect(Object.keys(es.profile.languageUse).sort()).toEqual(ids)
  })

  it('has a CEFR badge for every level stored in the CV', () => {
    for (const level of new Set(cvFacts.languages.map((language) => language.level))) {
      expect(en.profile.cefrBadge).toHaveProperty(level)
      expect(es.profile.cefrBadge).toHaveProperty(level)
    }
  })

  it('keeps the approved Spanish about and usage lines', () => {
    expect(es.profile.aboutQuote).toBe('«Pensamiento creativo + UX + prototipado = Producto Mínimo Viable.»')
    expect(es.profile.aboutBody).toBe(
      'Construyo plataformas web, dashboards, PWAs y sitios CMS sobre arquitecturas serverless y servidores. Integro IA en el desarrollo y en la automatización de procesos, con MCP y asistentes de chat para clientes. De punta a punta: de las APIs en Node y la capa de datos a las interfaces en React y Vue.',
    )
    expect(es.profile.languageUse).toEqual({
      spanish: 'Uso nativo: arquitectura, documentación y comunicación diaria.',
      english: 'Uso profesional: lectura técnica, código y reuniones de equipo.',
      italian: 'Uso conversacional: comprensión fluida y diálogo cotidiano.',
    })
    expect(es.profile.cefrBadge).toEqual({
      C2: 'C2 · Maestría',
      B2: 'B2 · Intermedio alto',
      B1: 'B1 · Intermedio',
    })
  })
})
