import { describe, expect, it } from 'vitest'
import { MOBILE_TIMELINE, segmentShareOf } from '../../lib/journey'
import {
  mobileCardStateAt,
  mobileFrameAt,
  mobileFrameCssVars,
  pointingArmOf,
  VISITS_PULSE_FROM,
  type MobileFrame,
} from '../../lib/mobileJourney'

/** Progreso a una fracción dada dentro del tramo de un punto (tras la entrada). */
const at = (pointIndex: number, segmentProgress: number) =>
  MOBILE_TIMELINE.entryShare + (pointIndex + segmentProgress) * segmentShareOf(MOBILE_TIMELINE)
const frame = (progress: number) => mobileFrameAt(progress)

describe('entrada «materializa» (p 0 → 0,14)', () => {
  it('al empezar el holograma no se ve, está tapado y a escala 1,2', () => {
    expect(frame(0)).toMatchObject<Partial<MobileFrame>>({
      holoOpacity: 0,
      holoScale: 1.2,
      curtain: 1,
      rayOpacity: 1,
      scanlinesOpacity: 1,
      glowOpacity: 0,
      glowScale: 0.6,
      timelineOpacity: 0,
    })
  })

  it('a mitad de la entrada ya es casi opaco (ease-out) y la cortina se va retirando', () => {
    const middle = frame(0.07)
    expect(middle.holoOpacity).toBe(1)
    expect(middle.curtain).toBeGreaterThan(0)
    expect(middle.curtain).toBeLessThan(0.2)
    expect(middle.holoScale).toBeLessThan(1.05)
  })

  it('al terminar: nítido, sin cortina ni rayo, scanlines de textura y timeline visible', () => {
    expect(frame(0.14)).toMatchObject<Partial<MobileFrame>>({
      holoOpacity: 1,
      holoScale: 1,
      curtain: 0,
      rayOpacity: 0,
      scanlinesOpacity: 0.35,
      glowOpacity: 0.9,
      glowScale: 1,
      timelineOpacity: 1,
    })
  })

  it('la tarjeta del punto 1 (con el h1) se ve desde la carga', () => {
    expect(frame(0).cardOpacity).toBe(1)
    expect(frame(0).cardShiftPx).toBe(0)
  })
})

describe('cada punto', () => {
  it('caminando y parado: brazo en reposo, sin zoom y sin tarjeta (salvo el punto 1)', () => {
    for (const u of [0.1, 0.34]) {
      const { armAngleDeg, holoScale, cardOpacity, lineScale } = frame(at(2, u))
      expect({ armAngleDeg: Math.abs(armAngleDeg), holoScale, cardOpacity, lineScale }).toEqual({
        armAngleDeg: 0,
        holoScale: 1,
        cardOpacity: 0,
        lineScale: 0,
      })
    }
  })

  it('señala: brazo a ±55° (derecho en 1, 3, 5 y 6; izquierdo en 2 y 4) y zoom a 1,12', () => {
    expect(frame(at(2, 0.5)).armAngleDeg).toBeCloseTo(-55)
    expect(frame(at(1, 0.5)).armAngleDeg).toBeCloseTo(55)
    expect(frame(at(2, 0.5)).holoScale).toBeCloseTo(1.12)
    expect(frame(at(2, 0.5)).holoShiftPx).toBeCloseTo(6)
    expect(pointingArmOf(4)).toBe('right')
    expect(pointingArmOf(5)).toBe('right')
  })

  it('línea y tarjeta entran entre 0,46 y 0,62 (subiendo 14 px) y se quedan en la lectura', () => {
    const entering = frame(at(2, 0.5))
    expect(entering.cardOpacity).toBeGreaterThan(0)
    expect(entering.cardOpacity).toBeLessThan(1)
    expect(entering.cardShiftPx).toBeGreaterThan(0)
    expect(frame(at(2, 0.75))).toMatchObject({ cardOpacity: 1, cardShiftPx: 0, cardScale: 1, lineScale: 1 })
  })

  it('salida: la tarjeta se va hacia arriba, la línea se recoge y el brazo y el zoom vuelven', () => {
    const leaving = frame(at(2, 0.9999))
    expect(leaving.cardOpacity).toBeLessThan(0.01)
    expect(leaving.cardShiftPx).toBeCloseTo(-8, 1)
    expect(leaving.lineScale).toBeLessThan(0.01)
    expect(Math.abs(leaving.armAngleDeg)).toBeLessThan(0.5)
    expect(leaving.holoScale).toBeCloseTo(1, 2)
  })

  it('el punto 5 ya sale como los demás', () => {
    expect(frame(at(4, 0.9999)).cardOpacity).toBeLessThan(0.01)
  })

  it('el punto 6 (Visitas) no sale: su tarjeta sigue al final del recorrido, con la mini-gráfica completa', () => {
    expect(frame(1)).toMatchObject({ cardOpacity: 1, lineScale: 1, visitsDraw: 1, cardScale: 1 })
  })

  it('hacia atrás se recorre lo mismo (todo depende de p)', () => {
    expect(frame(at(3, 0.55))).toEqual(frame(at(3, 0.55)))
  })
})

describe('punto 6 «Visitas»', () => {
  it('el marcador lanza un anillo una vez en la parada (scale 1 → 2, opacidad 0,6 → 0)', () => {
    expect(frame(at(4, 0.34))).toMatchObject({ ringScale: 1, ringOpacity: 0 })
    const ringing = frame(at(5, 0.33))
    expect(ringing.ringScale).toBeGreaterThan(1)
    expect(ringing.ringOpacity).toBeGreaterThan(0)
    expect(ringing.ringOpacity).toBeLessThanOrEqual(0.6)
    expect(frame(at(5, 0.5))).toMatchObject({ ringScale: 2, ringOpacity: 0 })
  })

  it('«tap»: el brazo vuelve 8° hacia el cuerpo y regresa a −55°', () => {
    expect(frame(at(5, 0.51)).armAngleDeg).toBeCloseTo(-47, 0)
    expect(frame(at(5, 0.56)).armAngleDeg).toBeCloseTo(-55)
  })

  it('tarjeta: entra con scale 0,96 y sube 16 px entre 0,46 y 0,60', () => {
    const entering = frame(at(5, 0.47))
    expect(entering.cardScale).toBeGreaterThanOrEqual(0.96)
    expect(entering.cardScale).toBeLessThan(0.98)
    expect(entering.cardShiftPx).toBeLessThanOrEqual(16)
    expect(frame(at(5, 0.6))).toMatchObject({ cardOpacity: 1, cardShiftPx: 0 })
  })

  it('mini-gráfica y KPI: 0 hasta 0,58, a medias en el centro y completos en 0,82 (ligado al scroll)', () => {
    expect(frame(at(5, 0.57)).visitsDraw).toBe(0)
    expect(frame(at(5, 0.7)).visitsDraw).toBeCloseTo(0.5, 1)
    expect(frame(at(5, VISITS_PULSE_FROM + 0.001)).visitsDraw).toBe(1)
    expect(frame(at(4, 0.7)).visitsDraw).toBe(0)
  })
})

describe('tarjeta en el sitio', () => {
  it('la del punto actual es la activa en todo su tramo; las otras, pasadas o por llegar', () => {
    const { state } = frame(at(2, 0.1))
    expect([0, 1, 2, 3, 4, 5].map((index) => mobileCardStateAt(index, state))).toEqual([
      'past',
      'past',
      'current',
      'upcoming',
      'upcoming',
      'upcoming',
    ])
  })
})

describe('variables CSS', () => {
  it('cada brazo recibe su giro y el otro queda a 0°', () => {
    const right = mobileFrameCssVars(frame(at(2, 0.75)))
    expect(right['--arm-right']).toBe('-55deg')
    expect(right['--arm-left']).toBe('0deg')
    const left = mobileFrameCssVars(frame(at(1, 0.75)))
    expect(left['--arm-left']).toBe('55deg')
    expect(left['--card-shift']).toBe('0px')
  })
})
