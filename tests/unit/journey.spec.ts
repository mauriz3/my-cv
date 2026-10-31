import { describe, expect, it } from 'vitest'
import {
  JOURNEY_POINTS,
  PHASE_ENDS,
  WALK_IDLE_MS,
  cardStateAt,
  isCardShown,
  isPointing,
  isStepping,
  journeyStateAt,
  MOBILE_TIMELINE,
  PINNED_TIMELINE,
  segmentShareOf,
  journeyTimingCssVars,
  markerStateAt,
  pointPosition,
  readingProgressOf,
  scrollProgress,
} from '../../lib/journey'

/** Progreso a una fracción dada dentro del tramo de un punto. */
const at = (pointIndex: number, segmentProgress: number) =>
  (pointIndex + segmentProgress) * segmentShareOf(PINNED_TIMELINE)

describe('reparto del recorrido', () => {
  it('5 puntos en orden: Profile, Skills, Experience, Education, Projects', () => {
    expect(JOURNEY_POINTS.map((point) => point.id)).toEqual([
      'profile',
      'skills',
      'experience',
      'education',
      'projects',
    ])
  })

  it('cada punto ocupa un 20 % del scroll y sus fases cubren el tramo entero', () => {
    expect(segmentShareOf(PINNED_TIMELINE)).toBeCloseTo(0.2)
    expect(PHASE_ENDS.map(([phase]) => phase)).toEqual(['walk', 'stop', 'point', 'reveal', 'read', 'leave'])
    expect(PHASE_ENDS.at(-1)?.[1]).toBe(1)
  })

  it('los puntos se reparten de extremo a extremo del timeline', () => {
    expect(JOURNEY_POINTS.map((_, index) => pointPosition(index))).toEqual([0, 0.25, 0.5, 0.75, 1])
  })
})

describe('fases y posición', () => {
  it('empieza parado y leyendo en el punto 1 (tarjeta con el h1 visible)', () => {
    expect(journeyStateAt(0)).toMatchObject({ pointIndex: 0, phase: 'read', position: 0 })
    expect(journeyStateAt(at(0, 0.5)).phase).toBe('read')
    expect(journeyStateAt(at(0, 0.95)).phase).toBe('leave')
  })

  it('en cada tramo: caminar, parada, señalar, tarjeta, lectura y continuar', () => {
    expect(journeyStateAt(at(2, 0.1)).phase).toBe('walk')
    expect(journeyStateAt(at(2, 0.45)).phase).toBe('stop')
    expect(journeyStateAt(at(2, 0.55)).phase).toBe('point')
    expect(journeyStateAt(at(2, 0.65)).phase).toBe('reveal')
    expect(journeyStateAt(at(2, 0.8)).phase).toBe('read')
    expect(journeyStateAt(at(2, 0.95)).phase).toBe('leave')
  })

  it('al caminar va del punto anterior al actual con arranque y frenada suaves', () => {
    expect(journeyStateAt(at(2, 0)).position).toBeCloseTo(pointPosition(1))
    expect(journeyStateAt(at(2, 0.2)).position).toBeCloseTo((pointPosition(1) + pointPosition(2)) / 2)
    expect(journeyStateAt(at(2, 0.39)).position).toBeLessThan(pointPosition(2))
    expect(journeyStateAt(at(2, 0.45)).position).toBe(pointPosition(2))
  })

  it('se queda leyendo en el último punto hasta el final', () => {
    expect(journeyStateAt(1)).toMatchObject({ pointIndex: 4, phase: 'read', position: 1 })
    expect(journeyStateAt(at(4, 0.95)).phase).toBe('read')
  })

  it('fuera de rango se limita al primer o al último punto', () => {
    expect(journeyStateAt(-1).pointIndex).toBe(0)
    expect(journeyStateAt(2).pointIndex).toBe(4)
  })
})

describe('marcadores del timeline', () => {
  const states = (progress: number) => JOURNEY_POINTS.map((_, index) => markerStateAt(index, journeyStateAt(progress)))

  it('parado en el punto 3: hechos los anteriores, actual el 3, pendientes los siguientes', () => {
    expect(states(at(2, 0.8))).toEqual(['done', 'done', 'current', 'pending', 'pending'])
  })

  it('caminando hacia el punto 3: el destino sigue pendiente y no hay actual', () => {
    expect(states(at(2, 0.1))).toEqual(['done', 'done', 'pending', 'pending', 'pending'])
  })
})

describe('gestos, tarjeta y zancada', () => {
  it('señala desde la fase «señalar» hasta la lectura y la tarjeta solo se ve con la línea', () => {
    expect(isPointing('walk')).toBe(false)
    expect(isPointing('point')).toBe(true)
    expect(isPointing('leave')).toBe(false)
    expect(isCardShown('point')).toBe(false)
    expect(isCardShown('reveal')).toBe(true)
    expect(isCardShown('read')).toBe(true)
  })

  it('la zancada avanza solo caminando y con scroll reciente (pausa a los 120 ms)', () => {
    expect(isStepping('walk', 0)).toBe(true)
    expect(isStepping('walk', WALK_IDLE_MS - 1)).toBe(true)
    expect(isStepping('walk', WALK_IDLE_MS)).toBe(false)
    expect(isStepping('read', 0)).toBe(false)
  })
})

describe('estado de las tarjetas', () => {
  const cards = (progress: number) => JOURNEY_POINTS.map((_, index) => cardStateAt(index, journeyStateAt(progress)))

  it('al cargar se ve la tarjeta de Profile (lleva el h1)', () => {
    expect(cards(0)).toEqual(['current', 'upcoming', 'upcoming', 'upcoming', 'upcoming'])
  })

  it('caminando hacia el punto 3: su tarjeta aún no está y las anteriores ya salieron', () => {
    expect(cards(at(2, 0.2))).toEqual(['past', 'past', 'upcoming', 'upcoming', 'upcoming'])
  })

  it('parado en el punto 3: solo se ve su tarjeta; al continuar sale', () => {
    expect(cards(at(2, 0.8))).toEqual(['past', 'past', 'current', 'upcoming', 'upcoming'])
    expect(cards(at(2, 0.95))[2]).toBe('past')
  })
})

describe('reanudar sin repetir puntos', () => {
  it.each([
    ['tablet y escritorio', PINNED_TIMELINE],
    ['móvil', MOBILE_TIMELINE],
  ])('%s: el progreso de lectura de cada punto cae en su fase de lectura', (_, timeline) => {
    JOURNEY_POINTS.forEach((_, index) => {
      const state = journeyStateAt(readingProgressOf(index, timeline), timeline)
      expect(state.pointIndex).toBe(index)
      expect(state.phase).toBe('read')
    })
  })
})

describe('recorrido móvil', () => {
  const mobileAt = (pointIndex: number, segmentProgress: number) =>
    MOBILE_TIMELINE.entryShare + (pointIndex + segmentProgress) * segmentShareOf(MOBILE_TIMELINE)

  it('entrada de 0,14 y después 5 tramos de 0,172', () => {
    expect(MOBILE_TIMELINE.entryShare).toBe(0.14)
    expect(segmentShareOf(MOBILE_TIMELINE)).toBeCloseTo(0.172)
    expect(MOBILE_TIMELINE.phaseEnds.at(-1)?.[1]).toBe(1)
  })

  it('durante la entrada espera al inicio del punto 1, sin leer todavía', () => {
    expect(journeyStateAt(0.07, MOBILE_TIMELINE)).toMatchObject({ pointIndex: 0, phase: 'walk', segmentProgress: 0 })
  })

  it('fases de la spec en cada tramo', () => {
    const phaseAt = (segmentProgress: number) => journeyStateAt(mobileAt(2, segmentProgress), MOBILE_TIMELINE).phase
    expect([0.1, 0.34, 0.42, 0.55, 0.75, 0.95].map(phaseAt)).toEqual([
      'walk',
      'stop',
      'point',
      'reveal',
      'read',
      'leave',
    ])
  })

  it('el primer punto camina en el sitio y el último se queda leyendo', () => {
    expect(journeyStateAt(mobileAt(0, 0.2), MOBILE_TIMELINE).position).toBe(0)
    expect(journeyStateAt(1, MOBILE_TIMELINE)).toMatchObject({ pointIndex: 4, phase: 'read' })
    expect(journeyStateAt(1, MOBILE_TIMELINE).segmentProgress).toBeCloseTo(1)
  })
})

describe('progreso del scroll', () => {
  it('va de 0 (sección arriba) a 1 (final de la sección abajo) y se limita', () => {
    expect(scrollProgress(0, 6000, 1000)).toBe(0)
    expect(scrollProgress(-2500, 6000, 1000)).toBe(0.5)
    expect(scrollProgress(-9000, 6000, 1000)).toBe(1)
    expect(scrollProgress(300, 6000, 1000)).toBe(0)
    expect(scrollProgress(-10, 800, 1000)).toBe(0)
  })
})

describe('tiempos como variables CSS', () => {
  it('salen de las constantes del handoff', () => {
    const vars = journeyTimingCssVars()
    expect(vars['--walk-cycle-duration']).toBe('800ms')
    expect(vars['--point-duration']).toBe('450ms')
    expect(vars['--journey-height-desktop']).toBe('600vh')
    expect(vars['--journey-height-tablet']).toBe('400vh')
    expect(vars['--journey-height-mobile']).toBe('380svh')
  })
})
