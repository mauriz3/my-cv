/**
 * Scroll storytelling del Perfil (handoff «Tanda C»). Lógica pura, sin Vue ni DOM:
 * tramos, progreso del scroll, pose del holograma, alturas de los pasos y contadores.
 * Todos los tiempos y escalas del handoff viven aquí, en un solo sitio.
 */

export type StoryStageId = 'intro' | 'scale' | 'numbers' | 'stack' | 'path' | 'cta'
/** Tono del fondo del tramo: decide los colores del texto que va encima. */
export type StoryTone = 'dark' | 'light'
/** Lado del texto en escritorio y tablet: el holograma ocupa el otro. */
export type StorySide = 'start' | 'end'
/** Fondo del tramo (los colores están en el CSS del storytelling). */
export const STORY_BACKGROUNDS = ['dark', 'halo', 'deep', 'light', 'white'] as const
export type StoryBackground = (typeof STORY_BACKGROUNDS)[number]

export interface StoryStage {
  id: StoryStageId
  /** Inicio y fin del tramo como fracción (0–1) del scroll de la sección. */
  start: number
  end: number
  tone: StoryTone
  background: StoryBackground
  side: StorySide
}

/** Tramos del storyboard (0–15–35–55–75–90–100 %). */
export const STORY_STAGES: readonly StoryStage[] = [
  { id: 'intro', start: 0, end: 0.15, tone: 'dark', background: 'dark', side: 'start' },
  { id: 'scale', start: 0.15, end: 0.35, tone: 'dark', background: 'halo', side: 'start' },
  { id: 'numbers', start: 0.35, end: 0.55, tone: 'dark', background: 'deep', side: 'end' },
  { id: 'stack', start: 0.55, end: 0.75, tone: 'light', background: 'light', side: 'end' },
  { id: 'path', start: 0.75, end: 0.9, tone: 'light', background: 'white', side: 'end' },
  { id: 'cta', start: 0.9, end: 1, tone: 'dark', background: 'dark', side: 'start' },
]

/** Al entrar en este tramo el holograma pierde la señal (glitch). */
export const GLITCH_STAGE_ID: StoryStageId = 'stack'
/** En este tramo el holograma queda estable (sin flicker). */
export const STABLE_STAGE_ID: StoryStageId = 'cta'

/** Alto de la sección `.story` (en vh) cuando hay pin. En móvil (< 768 px) no hay pin. */
export const STORY_HEIGHT_VH = { desktop: 500, tablet: 400 } as const
/** El contenedor sticky ocupa una pantalla. */
export const VIEWPORT_VH = 100

/** Tiempos y curvas del handoff. El CSS los lee como variables (ver `storyTimingCssVars`). */
export const STORY_TIMING = {
  layerEnterMs: 700,
  layerEase: 'cubic-bezier(0.22, 1, 0.36, 1)',
  layerOffsetPx: 24,
  backgroundMs: 600,
  backgroundEase: 'cubic-bezier(0.4, 0, 0.2, 1)',
  cardStaggerMs: 80,
  glitchMs: 400,
  flickerCycleMs: 5000,
  scanCycleMs: 6000,
  counterMs: 900,
} as const

/** Variables CSS con los tiempos: así el CSS no repite ningún número. */
export function storyTimingCssVars(): Record<string, string> {
  return {
    '--story-layer-duration': `${STORY_TIMING.layerEnterMs}ms`,
    '--story-layer-ease': STORY_TIMING.layerEase,
    '--story-layer-offset': `${STORY_TIMING.layerOffsetPx}px`,
    '--story-bg-duration': `${STORY_TIMING.backgroundMs}ms`,
    '--story-bg-ease': STORY_TIMING.backgroundEase,
    '--story-stagger': `${STORY_TIMING.cardStaggerMs}ms`,
    '--holo-glitch-duration': `${STORY_TIMING.glitchMs}ms`,
    '--holo-flicker-duration': `${STORY_TIMING.flickerCycleMs}ms`,
    '--holo-scan-duration': `${STORY_TIMING.scanCycleMs}ms`,
  }
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount
}

/**
 * Progreso (0–1) del scroll dentro de la sección: 0 cuando su borde superior toca el de la ventana,
 * 1 cuando su borde inferior toca el de la ventana. `sectionTop` es relativo a la ventana (getBoundingClientRect).
 */
export function scrollProgress(sectionTop: number, sectionHeight: number, viewportHeight: number): number {
  const scrollableDistance = sectionHeight - viewportHeight
  if (scrollableDistance <= 0) return 0
  return clamp01(-sectionTop / scrollableDistance)
}

/** Tramo activo para un progreso dado (el último incluye el 100 %). */
export function stageAt(progress: number): StoryStage {
  const clamped = clamp01(progress)
  const lastStage = STORY_STAGES[STORY_STAGES.length - 1]!
  return STORY_STAGES.find((stage) => clamped < stage.end) ?? lastStage
}

/** Pose del holograma: escala, desplazamiento horizontal (% del escenario) y vertical (px). */
export interface HoloPose {
  scale: number
  xPercent: number
  yPx: number
}

/** Hacia la izquierda en Números, Stack y Trayectoria: deja sitio al texto, que va a la derecha. */
const HOLO_LEFT_X_PERCENT = -48
const HOLO_PARALLAX_Y_PX = -40

/** Poses clave por progreso; entre dos claves se interpola en lineal (ligado al scroll, sin duración). */
export const HOLO_KEYFRAMES: readonly { progress: number; pose: HoloPose }[] = [
  { progress: 0, pose: { scale: 0.6, xPercent: 0, yPx: 0 } },
  { progress: 0.15, pose: { scale: 0.6, xPercent: 0, yPx: 0 } },
  { progress: 0.35, pose: { scale: 1.25, xPercent: 0, yPx: HOLO_PARALLAX_Y_PX } },
  { progress: 0.5, pose: { scale: 1.25, xPercent: HOLO_LEFT_X_PERCENT, yPx: 0 } },
  { progress: 0.6, pose: { scale: 0.5, xPercent: HOLO_LEFT_X_PERCENT, yPx: 0 } },
  { progress: 0.9, pose: { scale: 0.5, xPercent: HOLO_LEFT_X_PERCENT, yPx: 0 } },
  { progress: 1, pose: { scale: 1, xPercent: 0, yPx: 0 } },
]

export function holoPoseAt(progress: number): HoloPose {
  const clamped = clamp01(progress)
  const nextIndex = HOLO_KEYFRAMES.findIndex((keyframe) => keyframe.progress >= clamped)
  const next = HOLO_KEYFRAMES[nextIndex]!
  if (nextIndex <= 0) return next.pose
  const previous = HOLO_KEYFRAMES[nextIndex - 1]!
  const amount = (clamped - previous.progress) / (next.progress - previous.progress)
  return {
    scale: lerp(previous.pose.scale, next.pose.scale, amount),
    xPercent: lerp(previous.pose.xPercent, next.pose.xPercent, amount),
    yPx: lerp(previous.pose.yPx, next.pose.yPx, amount),
  }
}

/**
 * Alto (vh) de cada paso de texto para que cada uno pase por el centro de la ventana justo en su tramo.
 * El centro de la ventana está en `progreso × (alto − 100vh) + 50vh` dentro de la sección.
 */
export function stepHeightsVh(storyHeightVh: number): number[] {
  const scrollableVh = storyHeightVh - VIEWPORT_VH
  const viewportMiddleAt = (progress: number) => progress * scrollableVh + VIEWPORT_VH / 2
  const lastIndex = STORY_STAGES.length - 1
  return STORY_STAGES.map((stage, index) => {
    const top = index === 0 ? 0 : viewportMiddleAt(stage.start)
    const bottom = index === lastIndex ? storyHeightVh : viewportMiddleAt(stage.end)
    return bottom - top
  })
}

const EXPO_STEEPNESS = 10

/** Aproxima cubic-bezier(0.16, 1, 0.3, 1) del handoff: arranca rápido y frena al final. */
export function easeOutExpo(progress: number): number {
  const clamped = clamp01(progress)
  return clamped === 1 ? 1 : 1 - Math.pow(2, -EXPO_STEEPNESS * clamped)
}

/** Valor del contador de 0 a `target` tras `elapsedMs` (entero, termina exacto en `target`). */
export function countUpValue(target: number, elapsedMs: number, durationMs: number = STORY_TIMING.counterMs): number {
  return Math.round(target * easeOutExpo(elapsedMs / durationMs))
}
