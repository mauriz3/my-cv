import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  MOBILE_CARD_RANGE,
  PINNED_CARD_RANGE,
  PINNED_FIRST_CARD_RANGE,
  cardMotionCssVars,
  cardMotionKindOf,
  cardMotionValues,
  profileCounterProgress,
  profileMotionOptions,
  flowCardProgress,
  mobileFirstCardProgress,
  pinnedCardProgress,
  pinnedCardRange,
  profileCountProgress,
  type CardMotionKind,
} from '../../lib/cardMotion'
import { MOBILE_TIMELINE, PINNED_TIMELINE, cardStateAt, journeyStateAt, type JourneyState } from '../../lib/journey'

const KINDS: CardMotionKind[] = ['profile', 'skills', 'experience', 'education', 'projects']
const VIEWPORT = 900
const stateAt = (pointIndex: number, segmentProgress: number): JourneyState => ({
  pointIndex,
  phase: 'read',
  position: 0,
  segmentProgress,
})

describe('progreso p de cada tarjeta', () => {
  it('en el flujo: 0 con la tarjeta bajo la ventana, 1 cuando su borde superior llega al 40 %', () => {
    expect(flowCardProgress(VIEWPORT, VIEWPORT)).toBe(0)
    expect(flowCardProgress(VIEWPORT * 0.7, VIEWPORT)).toBeCloseTo(0.5)
    expect(flowCardProgress(VIEWPORT * 0.4, VIEWPORT)).toBe(1)
    expect(flowCardProgress(-200, VIEWPORT)).toBe(1)
  })

  it('con pin: las leídas en estado final, las que faltan en el inicial y la actual según su tramo', () => {
    expect(pinnedCardProgress(2, 'past', stateAt(3, 0), PINNED_TIMELINE)).toBe(1)
    expect(pinnedCardProgress(4, 'upcoming', stateAt(3, 0), PINNED_TIMELINE)).toBe(0)
    expect(pinnedCardProgress(3, 'current', stateAt(3, PINNED_CARD_RANGE.from), PINNED_TIMELINE)).toBe(0)
    expect(pinnedCardProgress(3, 'current', stateAt(3, PINNED_CARD_RANGE.to), PINNED_TIMELINE)).toBe(1)
  })

  it('tramos: Profile con el primer scroll en escritorio; en móvil, la entrada de la tarjeta (0,46–0,62)', () => {
    expect(pinnedCardRange(0, PINNED_TIMELINE)).toBe(PINNED_FIRST_CARD_RANGE)
    expect(pinnedCardRange(2, PINNED_TIMELINE)).toBe(PINNED_CARD_RANGE)
    expect(pinnedCardRange(0, MOBILE_TIMELINE)).toEqual({ from: 0.46, to: 0.62 })
    expect(pinnedCardRange(4, MOBILE_TIMELINE)).toBe(MOBILE_CARD_RANGE)
  })

  it('Profile en móvil: su contenido entra con la entrada del holograma (0–0,14 del scroll)', () => {
    expect(mobileFirstCardProgress(0)).toBe(0)
    expect(mobileFirstCardProgress(0.07)).toBeCloseTo(0.5)
    expect(mobileFirstCardProgress(MOBILE_TIMELINE.entryShare)).toBe(1)
  })

  it('es reversible: ir y volver da el mismo p (sin bucle ni memoria)', () => {
    const forward = journeyStateAt(0.42)
    const back = journeyStateAt(0.42)
    expect(pinnedCardProgress(2, 'current', forward, PINNED_TIMELINE)).toBe(
      pinnedCardProgress(2, 'current', back, PINNED_TIMELINE),
    )
  })
})

describe('elementos de cada tarjeta', () => {
  it('Profile: todo en 0 al empezar y en 1 al terminar', () => {
    expect(Object.values(cardMotionValues('profile', 0)).every((value) => value === 0)).toBe(true)
    expect(Object.values(cardMotionValues('profile', 1)).every((value) => value === 1)).toBe(true)
  })

  it('Profile: cada elemento avanza sin retroceder cuando p sube', () => {
    let previous = cardMotionValues('profile', 0)
    for (let step = 1; step <= 50; step++) {
      const current = cardMotionValues('profile', step / 50)
      for (const name of Object.keys(current)) expect(current[name]!).toBeGreaterThanOrEqual(previous[name]! - 1e-9)
      previous = current
    }
  })

  it('Profile: eyebrow, subtítulo y descripción escalonados; los 4 KPI con stagger de 0,08', () => {
    const middle = cardMotionValues('profile', 0.3)
    expect(middle.eyebrow).toBe(1)
    expect(middle.headline!).toBeGreaterThan(middle.tagline!)
    const kpis = cardMotionValues('profile', 0.55)
    expect(kpis['kpi-0']!).toBeGreaterThan(kpis['kpi-1']!)
    expect(kpis['kpi-1']!).toBeGreaterThan(kpis['kpi-2']!)
    expect(cardMotionValues('profile', 0.8)['kpi-3']).toBe(1)
  })

  it('contadores de Profile: 0 → valor entre p 0,45 y 0,90', () => {
    expect(profileCountProgress(0.45)).toBe(0)
    expect(profileCountProgress(0.9)).toBe(1)
    expect(profileCountProgress(0.675)).toBeCloseTo(0.5, 2)
  })

  it('Perfil legible al cargar: KPI y contadores en el valor final con p = 0', () => {
    const state = journeyStateAt(0)
    const options = profileMotionOptions(0, 'profile', cardStateAt(0, state), state, 0, PINNED_TIMELINE, true)
    expect(options?.profileKpisReady).toBe(true)
    expect(cardMotionValues('profile', 0, options)['kpi-0']).toBe(1)
    expect(profileCounterProgress(0, options)).toBe(1)
    expect(cardMotionValues('profile', 0, options).headline).toBe(0)
  })

  it.each(KINDS.filter((kind) => kind !== 'profile'))('%s: variables «parte-canal» de su escena (Tanda G)', (kind) => {
    const names = Object.keys(cardMotionValues(kind, 0.5))
    const scenePattern = /^[a-z0-9-]+-(x|y|scale|scaleY|rotate|opacity|offset)$/
    expect(names.length).toBeGreaterThan(0)
    for (const name of names) {
      if (kind === 'education' && (name === 'cert' || name === 'courses')) continue
      expect(name).toMatch(scenePattern)
    }
  })

  it('Education: certificaciones y cursos escalonados en el cuerpo de la tarjeta', () => {
    const start = cardMotionValues('education', 0.55)
    const end = cardMotionValues('education', 0.85)
    expect(start.cert!).toBeGreaterThan(0)
    expect(start.courses!).toBeLessThan(end.courses!)
    expect(cardMotionValues('education', 1).cert).toBe(1)
    expect(cardMotionValues('education', 1).courses).toBe(1)
  })

  it('variables CSS con prefijo --fx- y 3 decimales (también negativas)', () => {
    expect(cardMotionCssVars('skills', 1)['--fx-radar-scale']).toBe('1')
    expect(Object.values(cardMotionCssVars('experience', 0.37)).every((value) => /^-?\d+(\.\d{1,3})?$/.test(value))).toBe(true)
  })
})

describe('tarjetas con animación', () => {
  it('Visitas no tiene microanimación', () => {
    expect(cardMotionKindOf('visits')).toBeNull()
    expect(cardMotionKindOf('skills')).toBe('skills')
  })
})

describe('Profile visible desde la carga (decisión de Maurizio)', () => {
  const source = (file: string) => readFileSync(new URL(`../../app/components/${file}`, import.meta.url), 'utf8')
  /** Reglas CSS (selector + cuerpo) cuyo selector incluye la clase dada. */
  const rulesWith = (css: string, className: string) =>
    [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, selector]) => selector!.includes(className)).map(([rule]) => rule!)

  it('el contenido animado de Profile no se oculta con p = 0: --fx solo mueve o escala, nunca la opacidad', () => {
    const rules = ['card-fx', 'card-fx--scale'].flatMap((className) => rulesWith(source('JourneyCard.vue'), `.${className}`))
    expect(rules.length).toBeGreaterThanOrEqual(2)
    for (const rule of rules) {
      expect(rule).not.toMatch(/opacity|visibility|display/)
      expect(rule).toMatch(/var\(--fx\)/)
    }
  })

  it('ningún componente de Profile liga su opacidad a --fx', () => {
    for (const file of ['JourneyCard.vue', 'ProfileJourney.vue', 'ProfileCounters.vue']) {
      expect(source(file)).not.toMatch(/opacity:\s*var\(--fx/)
    }
  })

  it('con p = 0 el contenido está en su estado inicial (desplazado, no oculto) y con p = 1 en el final', () => {
    expect(Object.values(cardMotionValues('profile', 0)).every((value) => value === 0)).toBe(true)
    expect(Object.values(cardMotionValues('profile', 1)).every((value) => value === 1)).toBe(true)
  })
})
