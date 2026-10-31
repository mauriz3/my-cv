import { describe, expect, it } from 'vitest'
import {
  HOLO_KEYFRAMES,
  STORY_HEIGHT_VH,
  STORY_STAGES,
  STORY_TIMING,
  countUpValue,
  holoPoseAt,
  scrollProgress,
  stageAt,
  stepHeightsVh,
  storyTimingCssVars,
} from '../../lib/story'

describe('tramos del storytelling', () => {
  it('cubren 0–100 % sin huecos ni solapes', () => {
    expect(STORY_STAGES[0]?.start).toBe(0)
    expect(STORY_STAGES.at(-1)?.end).toBe(1)
    STORY_STAGES.slice(1).forEach((stage, index) => expect(stage.start).toBe(STORY_STAGES[index]?.end))
  })

  it('el progreso elige el tramo del handoff', () => {
    expect(stageAt(0).id).toBe('intro')
    expect(stageAt(0.149).id).toBe('intro')
    expect(stageAt(0.15).id).toBe('scale')
    expect(stageAt(0.4).id).toBe('numbers')
    expect(stageAt(0.6).id).toBe('stack')
    expect(stageAt(0.8).id).toBe('path')
    expect(stageAt(0.95).id).toBe('cta')
    expect(stageAt(1).id).toBe('cta')
  })

  it('fuera de rango se queda en el primer o el último tramo', () => {
    expect(stageAt(-0.5).id).toBe('intro')
    expect(stageAt(1.5).id).toBe('cta')
  })
})

describe('progreso del scroll', () => {
  const VIEWPORT = 800
  const SECTION = 4000

  it('va de 0 (sección arriba) a 1 (fin de la sección abajo)', () => {
    expect(scrollProgress(0, SECTION, VIEWPORT)).toBe(0)
    expect(scrollProgress(-1600, SECTION, VIEWPORT)).toBe(0.5)
    expect(scrollProgress(-3200, SECTION, VIEWPORT)).toBe(1)
  })

  it('se limita a 0–1 antes y después de la sección', () => {
    expect(scrollProgress(500, SECTION, VIEWPORT)).toBe(0)
    expect(scrollProgress(-9000, SECTION, VIEWPORT)).toBe(1)
  })

  it('una sección que cabe en la ventana no tiene progreso', () => {
    expect(scrollProgress(-10, VIEWPORT, VIEWPORT)).toBe(0)
  })
})

describe('pose del holograma', () => {
  it('entra a escala 0,6, crece a 1,25 con parallax −40 px y acaba estable a escala 1', () => {
    expect(holoPoseAt(0)).toEqual({ scale: 0.6, xPercent: 0, yPx: 0 })
    expect(holoPoseAt(0.35)).toEqual({ scale: 1.25, xPercent: 0, yPx: -40 })
    expect(holoPoseAt(1)).toEqual({ scale: 1, xPercent: 0, yPx: 0 })
  })

  it('interpola en lineal entre poses clave', () => {
    const halfway = holoPoseAt(0.25)
    expect(halfway.scale).toBeCloseTo(0.925)
    expect(halfway.yPx).toBeCloseTo(-20)
  })

  it('en Stack y Trayectoria está pequeño (0,5) y a la izquierda', () => {
    const pose = holoPoseAt(0.8)
    expect(pose.scale).toBe(0.5)
    expect(pose.xPercent).toBeLessThan(0)
  })

  it('las poses clave van en orden de progreso', () => {
    const progresses = HOLO_KEYFRAMES.map((keyframe) => keyframe.progress)
    expect(progresses).toEqual([...progresses].sort((a, b) => a - b))
  })
})

describe('alto de los pasos de texto', () => {
  it.each(Object.values(STORY_HEIGHT_VH))('suman el alto de la sección (%i vh)', (storyHeight) => {
    const total = stepHeightsVh(storyHeight).reduce((sum, height) => sum + height, 0)
    expect(total).toBeCloseTo(storyHeight)
  })

  it('cada paso cruza el centro de la ventana en su tramo (escritorio, 500 vh)', () => {
    expect(stepHeightsVh(STORY_HEIGHT_VH.desktop)).toEqual([110, 80, 80, 80, 60, 90])
  })
})

describe('contadores', () => {
  it('empiezan en 0 y terminan exactos en el valor final', () => {
    expect(countUpValue(10, 0)).toBe(0)
    expect(countUpValue(10, STORY_TIMING.counterMs)).toBe(10)
    expect(countUpValue(10, STORY_TIMING.counterMs * 2)).toBe(10)
  })

  it('suben sin pasarse y frenan al final (ease-out)', () => {
    const values = [0, 100, 300, 600, 900].map((elapsed) => countUpValue(100, elapsed))
    expect(values).toEqual([...values].sort((a, b) => a - b))
    expect(values[1]).toBeGreaterThan(50 * (100 / STORY_TIMING.counterMs))
    expect(Math.max(...values)).toBe(100)
  })
})

describe('tiempos como variables CSS', () => {
  it('salen de las constantes del handoff', () => {
    const vars = storyTimingCssVars()
    expect(vars['--story-layer-duration']).toBe('700ms')
    expect(vars['--story-stagger']).toBe('80ms')
    expect(vars['--holo-glitch-duration']).toBe('400ms')
    expect(vars['--holo-flicker-duration']).toBe('5000ms')
  })
})
