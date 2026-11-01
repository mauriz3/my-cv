<script setup lang="ts">
import {
  CORNER_ICON_VIEWBOX,
  EXPERIENCE_POINTS,
  PROJECTS_LINE_COUNT,
  RADAR_GUIDE_SHARES,
  radarPoints,
  svgPoints,
  type CornerIconKind,
} from '~~/lib/cardMotion'

/**
 * Icono decorativo de la esquina de una tarjeta del recorrido (Tanda F). Pinta el estado final (= estático);
 * con movimiento, el CSS de la tarjeta lo lleva por sus fases con las variables `--fx-*` que escribe
 * `useCardMotion` (solo transform, opacity y stroke-dashoffset). Colores: variables de marca del tema.
 */
const props = defineProps<{ kind: CornerIconKind }>()
const cv = useCv()

const VIEWBOX = `0 0 ${CORNER_ICON_VIEWBOX} ${CORNER_ICON_VIEWBOX}`
/** Niveles del radar = los del radar «Skill profile» de los datos (mismo orden de ejes). */
const radarLevels = computed(() => cv.value.skillProfile.map((axis) => axis.level))
const radarData = computed(() => radarPoints(radarLevels.value))
const radarGuides = computed(() =>
  RADAR_GUIDE_SHARES.map((share) => svgPoints(radarPoints(radarLevels.value.map(() => share)))),
)
const experienceLine = svgPoints(EXPERIENCE_POINTS)
const lastNode = EXPERIENCE_POINTS[EXPERIENCE_POINTS.length - 1]!
const earlierNodes = EXPERIENCE_POINTS.slice(0, -1)
const EDUCATION_STEPS = '6,64 20,64 20,52 34,52 34,40 48,40 48,28 62,28'
/** Líneas de la ventana de código: [x inicial, y, x final]. */
const CODE_LINES: readonly (readonly [number, number, number])[] = [
  [14, 31, 42],
  [20, 39, 52],
  [20, 47, 40],
  [14, 55, 30],
]
if (CODE_LINES.length !== PROJECTS_LINE_COUNT) throw new Error('CODE_LINES no coincide con PROJECTS_LINE_COUNT')
const WINDOW_DOTS_X = [12, 17, 22]
/** Avance del elemento `name` (lo escribe `useCardMotion`; sin él, estado final). */
const fx = (name: string) => ({ '--fx': `var(--fx-${name}, 1)` })
</script>

<template>
  <svg
    class="corner-icon"
    :data-icon="props.kind"
    :viewBox="VIEWBOX"
    fill="none"
    aria-hidden="true"
    focusable="false"
    data-testid="corner-icon"
  >
    <template v-if="kind === 'skills'">
      <polygon v-for="(points, index) in radarGuides" :key="index" class="corner-icon__guide" :points="points" />
      <g class="corner-icon__polygon corner-icon__grow" :style="fx('polygon')">
        <polygon class="corner-icon__area" :points="svgPoints(radarData)" />
        <g class="corner-icon__fade" :style="fx('vertices')">
          <circle
            v-for="([x, y], index) in radarData"
            :key="index"
            :cx="x"
            :cy="y"
            :r="index === 0 ? 3.2 : 2.4"
            :class="index === 0 ? 'corner-icon__accent' : 'corner-icon__dot'"
          />
        </g>
      </g>
      <circle class="corner-icon__dot" cx="36" cy="38" r="2" />
    </template>

    <template v-else-if="kind === 'experience'">
      <polyline class="corner-icon__track" :points="experienceLine" />
      <polyline class="corner-icon__stroke corner-icon__draw" :style="fx('line')" :points="experienceLine" pathLength="1" />
      <g v-for="([x, y], index) in earlierNodes" :key="index">
        <circle class="corner-icon__pending" :cx="x" :cy="y" r="3.5" />
        <circle class="corner-icon__dot corner-icon__node" :style="fx(`node-${index}`)" :cx="x" :cy="y" r="3.5" />
      </g>
      <circle class="corner-icon__pending" :cx="lastNode[0]" :cy="lastNode[1]" r="3.5" />
      <circle class="corner-icon__ring corner-icon__fade" :style="fx('ring')" :cx="lastNode[0]" :cy="lastNode[1]" r="8" />
      <circle class="corner-icon__accent corner-icon__node" :style="fx(`node-${earlierNodes.length}`)" :cx="lastNode[0]" :cy="lastNode[1]" r="4" />
    </template>

    <template v-else-if="kind === 'education'">
      <polyline class="corner-icon__track" :points="EDUCATION_STEPS" />
      <polyline class="corner-icon__stroke corner-icon__draw" :style="fx('steps')" :points="EDUCATION_STEPS" pathLength="1" />
      <g class="corner-icon__cap" :style="fx('cap')">
        <path class="corner-icon__area" d="M43 16 L55 10 L67 16 L55 22 Z" />
        <path class="corner-icon__stroke" d="M48 19 V24 Q55 28 62 24 V19" />
        <path class="corner-icon__tassel" d="M67 16 V23" />
        <circle class="corner-icon__accent-fill" cx="67" cy="24.5" r="1.8" />
      </g>
    </template>

    <template v-else>
      <g class="corner-icon__fade" :style="fx('frame')">
        <rect class="corner-icon__stroke" x="6" y="10" width="60" height="52" rx="6" />
        <path class="corner-icon__stroke corner-icon__thin" d="M6 20 H66" />
        <circle v-for="x in WINDOW_DOTS_X" :key="x" class="corner-icon__dot" :cx="x" cy="15" r="1.5" />
      </g>
      <g v-for="([x1, y, x2], index) in CODE_LINES" :key="index">
        <path class="corner-icon__ghost" :d="`M${x1} ${y} H${x2}`" />
        <path class="corner-icon__stroke corner-icon__draw" :style="fx(`line-${index}`)" :d="`M${x1} ${y} H${x2}`" pathLength="1" />
      </g>
      <rect class="corner-icon__fade corner-icon__accent-fill" :style="fx('cursor')" x="33" y="51.5" width="2.5" height="7" rx="1" />
    </template>
  </svg>
</template>

<style>
/* Estado final (= estático). Trazo de 2 px (1,5 en guías), puntas redondeadas, brand + acento puntual. */
.corner-icon {
  --corner-brand: var(--ui-primary);
  --corner-accent: var(--brand-vivid);
  --corner-track: var(--ui-text-muted);
  --corner-track-opacity: 0.35;
  --corner-surface: var(--ui-bg-elevated);
  width: 100%;
  height: auto;
  aspect-ratio: 1;
  overflow: visible;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.dark .corner-icon {
  --corner-track-opacity: 0.4;
}

.corner-icon__guide,
.corner-icon__track,
.corner-icon__ghost {
  stroke: var(--corner-track);
  stroke-opacity: var(--corner-track-opacity);
  stroke-width: 2;
}

.corner-icon__guide {
  stroke-width: 1.5;
}

.corner-icon__ghost {
  stroke-opacity: calc(var(--corner-track-opacity) * 0.6);
}

.corner-icon__stroke {
  stroke: var(--corner-brand);
  stroke-width: 2;
}

.corner-icon__thin {
  stroke-width: 1.5;
}

.corner-icon__area {
  fill: var(--corner-brand);
  fill-opacity: 0.14;
  stroke: var(--corner-brand);
  stroke-width: 2;
}

.corner-icon__dot {
  fill: var(--corner-brand);
}

.corner-icon__accent {
  fill: var(--corner-accent);
  stroke: var(--corner-brand);
  stroke-width: 1.5;
}

.corner-icon__accent-fill {
  fill: var(--corner-accent);
}

.corner-icon__tassel {
  stroke: var(--corner-accent);
  stroke-width: 2;
}

.corner-icon__pending {
  fill: var(--corner-surface);
  stroke: var(--corner-track);
  stroke-opacity: calc(var(--corner-track-opacity) + 0.2);
  stroke-width: 1.5;
}

.corner-icon__ring {
  stroke: var(--corner-brand);
  stroke-width: 1.5;
}

.corner-icon__draw {
  stroke-dasharray: 1 2;
}

.corner-icon__grow {
  transform-box: view-box;
  transform-origin: 36px 38px;
}

.corner-icon__node {
  transform-box: fill-box;
  transform-origin: center;
}

/* Con movimiento: cada elemento sigue su avance `--fx` (0 → 1). Con el foco del teclado, estado final. */
:root[data-motion='full'] .journey__card:not(:focus-within) .corner-icon__draw {
  stroke-dashoffset: calc(1 - var(--fx));
}

:root[data-motion='full'] .journey__card:not(:focus-within) .corner-icon__grow {
  scale: var(--fx);
}

:root[data-motion='full'] .journey__card:not(:focus-within) .corner-icon__fade {
  opacity: var(--fx);
}

:root[data-motion='full'] .journey__card:not(:focus-within) .corner-icon__node {
  opacity: var(--fx);
  scale: calc(0.6 + 0.4 * var(--fx));
}

:root[data-motion='full'] .journey__card:not(:focus-within) .corner-icon__cap {
  opacity: var(--fx);
  translate: 0 calc((var(--fx) - 1) * 10px);
}

:root[data-motion='full'] .journey__card[data-fx-active] .corner-icon__grow {
  will-change: transform;
}
</style>
