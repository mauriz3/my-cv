/**
 * Escenas a ancho completo de las tarjetas del recorrido (Tanda G, spec tanda-g/especificaciones.md):
 * geometría (viewBox 280×100) y, para cada p (0–1), el valor de cada canal animado de cada parte.
 * Sin bucles: todo es función de p (scrub reversible). En p = 1 todos los canales quedan en su valor neutro
 * (sin desplazar, escala 1, opacidad 1, trazo completo), así que el SVG sin variables ya es el estado final.
 */
import {
  clamp01,
  easeInOutCubic,
  easeOutCubic,
  halfSineBump,
  inverseOf,
  lerp,
  overshootOut,
  progressBetween,
} from './easing'

export type SceneKind = 'skills' | 'experience' | 'education' | 'projects'
export const SCENE_KINDS: readonly SceneKind[] = ['skills', 'experience', 'education', 'projects']

export const SCENE_VIEWBOX = { width: 280, height: 100 } as const

/** Canales que el CSS de la escena sabe aplicar (solo transform, opacity y stroke-dashoffset). */
export type SceneChannel = 'x' | 'y' | 'scale' | 'scaleY' | 'rotate' | 'opacity' | 'offset'
export type ScenePartValues = Partial<Record<SceneChannel, number>>
export type SceneValues = Record<string, ScenePartValues>

/** Valor de cada canal en el estado final (= estático): el que pinta el SVG sin variables. */
export const NEUTRAL_CHANNEL_VALUE: Record<SceneChannel, number> = {
  x: 0,
  y: 0,
  scale: 1,
  scaleY: 1,
  rotate: 0,
  opacity: 1,
  offset: 0,
}

type Point = readonly [number, number]
interface Range {
  from: number
  to: number
}

const POP_OVERSHOOT = 2
const TASSEL_OVERSHOOT = 2.2
const at = (p: number, { from, to }: Range) => progressBetween(p, from, to)
/** Tramo de duración `length` que empieza en `from`. */
const span = (from: number, length: number): Range => ({ from, to: from + length })
/** 0 hasta que empieza la fase, 1 desde entonces (aparición sin fundido). */
const shownFrom = (p: number, from: number) => (p > from ? 1 : 0)

/* ---------- Skills: radar hexagonal + 6 barras ---------- */

export const RADAR = { center: [52, 52] as Point, radius: 44, guideShares: [1, 0.5] } as const
export const BARS = { firstX: 124, step: 26, width: 16, baseY: 92, maxHeight: 80 } as const
const FULL_TURN_DEG = 360
const TOP_ANGLE_DEG = -90

/** Vértices de un radar (el primero arriba y en sentido horario) para niveles 0–1. */
export function radarPoints(levels: readonly number[]): [number, number][] {
  const step = FULL_TURN_DEG / levels.length
  return levels.map((level, index) => {
    const angle = ((TOP_ANGLE_DEG + step * index) * Math.PI) / 180
    return [
      round(RADAR.center[0] + RADAR.radius * level * Math.cos(angle)),
      round(RADAR.center[1] + RADAR.radius * level * Math.sin(angle)),
    ]
  })
}

export const SKILLS_TIMING = {
  radar: { from: 0, to: 0.45 },
  vertices: { from: 0.3, to: 0.5 },
  barFrom: 0.25,
  barStagger: 0.07,
  barDuration: 0.3,
  accentCap: { from: 0.85, to: 0.9 },
  flash: { from: 0.85, to: 1 },
} as const
export const SKILLS_BAR_COUNT = 6

function skillsValues(p: number): SceneValues {
  const values: SceneValues = {
    radar: { scale: overshootOut(at(p, SKILLS_TIMING.radar)) },
    vertices: { opacity: at(p, SKILLS_TIMING.vertices) },
    'accent-cap': { opacity: at(p, SKILLS_TIMING.accentCap) },
    flash: {
      scale: overshootOut(at(p, SKILLS_TIMING.flash), POP_OVERSHOOT),
      opacity: at(p, SKILLS_TIMING.flash),
    },
  }
  for (let index = 0; index < SKILLS_BAR_COUNT; index++) {
    const from = SKILLS_TIMING.barFrom + index * SKILLS_TIMING.barStagger
    values[`bar-${index}`] = { scaleY: overshootOut(at(p, span(from, SKILLS_TIMING.barDuration))) }
  }
  return values
}

/* ---------- Experience: trayectoria de 5 nodos (los 5 puestos) ---------- */

export const EXPERIENCE_POINTS: readonly Point[] = [
  [20, 88],
  [78, 74],
  [136, 60],
  [194, 46],
  [252, 30],
]
export const EXPERIENCE_RADII = { node: 6, milestone: 8, innerRing: 15, outerRing: 22 } as const

/** Posición (0–1, por longitud) de cada vértice a lo largo de una polilínea. */
export function polylineStops(points: readonly Point[]): number[] {
  const lengths = points.slice(1).map(([x, y], index) => Math.hypot(x - points[index]![0], y - points[index]![1]))
  const total = lengths.reduce((sum, length) => sum + length, 0)
  let travelled = 0
  return [0, ...lengths.map((length) => (travelled += length) / total)]
}

export function polylineLength(points: readonly Point[]): number {
  return points.slice(1).reduce((sum, [x, y], index) => sum + Math.hypot(x - points[index]![0], y - points[index]![1]), 0)
}

/** La estela va 50 unidades detrás de la cabeza de la línea (fracción de la longitud total). */
const TRAIL_LENGTH_UNITS = 50
export const EXPERIENCE_TRAIL_SHARE = round(TRAIL_LENGTH_UNITS / polylineLength(EXPERIENCE_POINTS))

export const EXPERIENCE_TIMING = {
  line: { from: 0, to: 0.8 },
  trailFade: { from: 0.75, to: 0.85 },
  nodeJump: 0.12,
  nodeJumpPx: 14,
  nodeScaleFrom: 0.6,
  milestone: { from: 0.8, to: 0.9 },
  outerRing: { from: 0.8, to: 1 },
  /** La onda exterior se hace visible en el primer tercio de su tramo. */
  outerRingFadeShare: 1 / 3,
  innerRing: { from: 0.87, to: 1 },
} as const

const experienceLine = (p: number) => easeInOutCubic(at(p, EXPERIENCE_TIMING.line))
const EXPERIENCE_STOPS = polylineStops(EXPERIENCE_POINTS)
/** p en el que la línea (ya suavizada) llega a cada nodo: ahí empieza su salto. */
export const EXPERIENCE_NODE_ARRIVALS = EXPERIENCE_STOPS.map((stop) =>
  stop === 0 ? 0 : inverseOf(experienceLine, stop),
)
/** Nodos que saltan (todos salvo el último, que es el hito). */
export const EXPERIENCE_JUMPING_NODES = EXPERIENCE_POINTS.length - 1

function experienceValues(p: number): SceneValues {
  const line = experienceLine(p)
  const outer = at(p, EXPERIENCE_TIMING.outerRing)
  const inner = at(p, EXPERIENCE_TIMING.innerRing)
  const { milestone, innerRing, outerRing } = EXPERIENCE_RADII
  const values: SceneValues = {
    line: { offset: 1 - line },
    // Dash de `EXPERIENCE_TRAIL_SHARE` que termina en la cabeza; no existe en el estado final.
    trail: { offset: EXPERIENCE_TRAIL_SHARE - line, opacity: p > 0 ? 1 - at(p, EXPERIENCE_TIMING.trailFade) : 0 },
    milestone: { scale: overshootOut(at(p, EXPERIENCE_TIMING.milestone), POP_OVERSHOOT) },
    // Los anillos están dibujados con su radio final: escalan desde el del hito (r 8).
    'outer-ring': {
      scale: lerp(milestone, outerRing, easeOutCubic(outer)) / outerRing,
      opacity: clamp01(outer / EXPERIENCE_TIMING.outerRingFadeShare),
    },
    'inner-ring': {
      scale: lerp(milestone, innerRing, easeOutCubic(inner)) / innerRing,
      opacity: shownFrom(p, EXPERIENCE_TIMING.innerRing.from),
    },
  }
  for (let index = 0; index < EXPERIENCE_JUMPING_NODES; index++) {
    const arrival = EXPERIENCE_NODE_ARRIVALS[index]!
    const jump = at(p, span(arrival, EXPERIENCE_TIMING.nodeJump))
    values[`node-${index}`] = {
      y: -EXPERIENCE_TIMING.nodeJumpPx * halfSineBump(jump),
      scale: lerp(EXPERIENCE_TIMING.nodeScaleFrom, 1, overshootOut(jump)),
      opacity: shownFrom(p, arrival),
    }
  }
  return values
}

/* ---------- Education: 4 escalones + birrete ---------- */

export const EDUCATION_STEPS = { firstX: 42, step: 48, width: 44, baseY: 94, heights: [16, 32, 48, 62] } as const
export const EDUCATION_TIMING = {
  stepStagger: 0.1,
  stepDuration: 0.3,
  stepRisePx: 40,
  /** Los escalones se hacen opacos en el primer 40 % de su tramo. */
  stepFadeShare: 0.4,
  capFall: { from: 0.5, to: 0.73 },
  capFallPx: 70,
  capBounce: { from: 0.73, to: 0.85 },
  capBouncePx: 9,
  /** El birrete se hace visible en el primer cuarto de su caída y rebote. */
  capFadeShare: 0.25,
  tassel: { from: 0.8, to: 1 },
  tasselFromDeg: 25,
} as const

function educationValues(p: number): SceneValues {
  const values: SceneValues = {}
  EDUCATION_STEPS.heights.forEach((_, index) => {
    const step = at(p, span(index * EDUCATION_TIMING.stepStagger, EDUCATION_TIMING.stepDuration))
    values[`step-${index}`] = {
      y: (1 - overshootOut(step)) * EDUCATION_TIMING.stepRisePx,
      opacity: clamp01(step / EDUCATION_TIMING.stepFadeShare),
    }
  })
  const fall = at(p, EDUCATION_TIMING.capFall)
  const bounce = at(p, EDUCATION_TIMING.capBounce)
  const capRange = { from: EDUCATION_TIMING.capFall.from, to: EDUCATION_TIMING.capBounce.to }
  // Cae con aceleración (t², gravedad) y rebota una vez (medio seno).
  const capY =
    bounce > 0
      ? -EDUCATION_TIMING.capBouncePx * halfSineBump(bounce)
      : -EDUCATION_TIMING.capFallPx * (1 - fall * fall)
  values.cap = { y: capY, opacity: clamp01(at(p, capRange) / EDUCATION_TIMING.capFadeShare) }
  values.tassel = {
    rotate: EDUCATION_TIMING.tasselFromDeg * (1 - overshootOut(at(p, EDUCATION_TIMING.tassel), TASSEL_OVERSHOOT)),
  }
  return values
}

/* ---------- Projects: ventana de código + deploy + pila de bloques ---------- */

export type CodeTone = 'main' | 'acc' | 'track'
/** Fichas de cada línea de código: [x inicial, longitud, tono]. Líneas en y = 36 + 12·i. */
export const CODE_LINES: readonly (readonly (readonly [number, number, CodeTone])[])[] = [
  [
    [20, 40, 'main'],
    [66, 50, 'acc'],
  ],
  [
    [32, 30, 'main'],
    [68, 60, 'track'],
  ],
  [[32, 56, 'main']],
  [
    [32, 24, 'acc'],
    [62, 46, 'main'],
  ],
  [[20, 30, 'main']],
]
export const CODE_LINE = { firstY: 36, step: 12 } as const
/** El cursor va 5 unidades por delante de la cabeza del tecleo. */
export const CURSOR_GAP = 5
export const STACK_BLOCKS_Y = [74, 52, 30] as const

export const PROJECTS_TIMING = {
  window: { from: 0, to: 0.15 },
  windowScaleFrom: 0.9,
  windowOpacityFrom: 0.3,
  lineFrom: 0.12,
  lineStagger: 0.09,
  lineDuration: 0.12,
  arrow: { from: 0.55, to: 0.7 },
  arrowHeadAt: 0.68,
  blockFrom: 0.6,
  blockStagger: 0.1,
  blockDuration: 0.15,
  blockDropPx: 40,
  /** Los bloques se hacen opacos en el primer tercio de su caída. */
  blockFadeShare: 1 / 3,
  check: { from: 0.9, to: 1 },
} as const

const lineStart = (tokens: (typeof CODE_LINES)[number]) => tokens[0]![0]
const lineEnd = (tokens: (typeof CODE_LINES)[number]) => tokens.at(-1)![0] + tokens.at(-1)![1]
const lineY = (index: number) => CODE_LINE.firstY + CODE_LINE.step * index

function projectsValues(p: number): SceneValues {
  const window = at(p, PROJECTS_TIMING.window)
  const values: SceneValues = {
    window: {
      scale: lerp(PROJECTS_TIMING.windowScaleFrom, 1, overshootOut(window)),
      opacity: lerp(PROJECTS_TIMING.windowOpacityFrom, 1, window),
    },
    arrow: { offset: 1 - easeInOutCubic(at(p, PROJECTS_TIMING.arrow)) },
    'arrow-head': { opacity: p >= PROJECTS_TIMING.arrowHeadAt ? 1 : 0 },
    check: { offset: 1 - easeOutCubic(at(p, PROJECTS_TIMING.check)) },
  }
  const lastLine = CODE_LINES.length - 1
  // El cursor descansa al final de la última línea y, mientras se teclea, sigue a la cabeza.
  let cursor: ScenePartValues = { x: 0, y: 0, opacity: 0 }
  CODE_LINES.forEach((tokens, index) => {
    const typed = at(p, span(PROJECTS_TIMING.lineFrom + index * PROJECTS_TIMING.lineStagger, PROJECTS_TIMING.lineDuration))
    const head = lerp(lineStart(tokens), lineEnd(tokens), typed)
    tokens.forEach(([x, length], token) => {
      values[`code-${index}-${token}`] = { offset: 1 - clamp01((head - x) / length) }
    })
    if (typed > 0) cursor = { x: head - lineEnd(CODE_LINES[lastLine]!), y: lineY(index) - lineY(lastLine), opacity: 1 }
  })
  values.cursor = cursor
  STACK_BLOCKS_Y.forEach((_, index) => {
    const drop = at(p, span(PROJECTS_TIMING.blockFrom + index * PROJECTS_TIMING.blockStagger, PROJECTS_TIMING.blockDuration))
    values[`block-${index}`] = {
      y: -(1 - overshootOut(drop)) * PROJECTS_TIMING.blockDropPx,
      opacity: clamp01(drop / PROJECTS_TIMING.blockFadeShare),
    }
  })
  return values
}

/* ---------- Valores por escena y paso a variables ---------- */

const VALUES_OF: Record<SceneKind, (p: number) => SceneValues> = {
  skills: skillsValues,
  experience: experienceValues,
  education: educationValues,
  projects: projectsValues,
}

/** Canales animados de cada parte de la escena para el progreso p (0–1). */
export function sceneValues(kind: SceneKind, p: number): SceneValues {
  return VALUES_OF[kind](clamp01(p))
}

/** Nombre de la variable que escribe la tarjeta (sin el prefijo `--fx-`): «parte-canal». */
export const sceneVariableName = (part: string, channel: SceneChannel) => `${part}-${channel}`

/** Estado inicial (p = 0) de cada escena, «parte-canal» → número. */
export const INITIAL_SCENE_VALUES = Object.fromEntries(
  SCENE_KINDS.map((kind) => [kind, flatSceneValues(kind, 0)]),
) as Record<SceneKind, Record<string, number>>

/**
 * Referencia CSS a la variable de un canal con el valor de p = 0 como respaldo. Así, con movimiento, el HTML
 * prerenderizado ya pinta el estado inicial antes de que el JS escriba la primera variable (sin parpadeo).
 * El respaldo solo se lee bajo `data-motion="full"`: sin JS o con movimiento reducido, el estado final.
 */
export function sceneVariableReference(kind: SceneKind, part: string, channel: SceneChannel): string {
  const name = sceneVariableName(part, channel)
  const initial = INITIAL_SCENE_VALUES[kind][name] ?? NEUTRAL_CHANNEL_VALUE[channel]
  return `var(--fx-${name}, ${round(initial)})`
}

/** Valores planos «parte-canal» → número (los usa `cardMotionValues`). */
export function flatSceneValues(kind: SceneKind, p: number): Record<string, number> {
  const flat: Record<string, number> = {}
  for (const [part, channels] of Object.entries(sceneValues(kind, p))) {
    for (const [channel, value] of Object.entries(channels) as [SceneChannel, number][]) {
      flat[sceneVariableName(part, channel)] = value
    }
  }
  return flat
}

function round(value: number) {
  return Number(value.toFixed(3))
}

export const svgPoints = (points: readonly Point[]) => points.map(([x, y]) => `${x},${y}`).join(' ')
