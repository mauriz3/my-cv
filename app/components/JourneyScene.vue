<script setup lang="ts">
import {
  BARS,
  PROFILE_FICHE_LINE,
  PROFILE_FICHE_WINDOW,
  PROFILE_FIELD_LINES,
  PROFILE_PROGRESS_BAR,
  PROFILE_VIEWFINDER,
  CODE_LINE,
  CODE_LINES,
  CURSOR_GAP,
  EDUCATION_STEPS,
  EXPERIENCE_JUMPING_NODES,
  EXPERIENCE_POINTS,
  EXPERIENCE_RADII,
  EXPERIENCE_TRAIL_SHARE,
  RADAR,
  SCENE_VIEWBOX,
  STACK_BLOCKS_Y,
  radarPoints,
  sceneVariableReference,
  svgPoints,
  type SceneChannel,
  type SceneKind,
} from '~~/lib/journeyScene'

/**
 * Full-width decorative scene under the title of a tour card (Tanda G). Paint the status
 * end (= static: reduced movement, pause or no JS). With movement, `useCardMotion` writes to the card
 * `--fx-<part>-<channel>` variables (lib/journeyScene) and the CSS below applies them (transform,
 * opacity, and stroke-dashoffset only). Until JS writes the first value, each channel uses p = 0 from first
 * paint without flashing; without `data-motion="full"` those rules do not apply (final state).
 */
const props = defineProps<{ kind: SceneKind }>()
const cv = useCv()

const VIEWBOX = `0 0 ${SCENE_VIEWBOX.width} ${SCENE_VIEWBOX.height}`

/** Per-channel CSS variable and class that applies it. */
const CHANNEL_VARIABLE: Record<SceneChannel, string> = {
  x: '--scene-x',
  y: '--scene-y',
  scale: '--scene-scale',
  scaleY: '--scene-scale-y',
  rotate: '--scene-rotate',
  opacity: '--scene-opacity',
  offset: '--scene-offset',
}
const CHANNEL_CLASS: Record<SceneChannel, string> = {
  x: 'scene-fx--move',
  y: 'scene-fx--move',
  scale: 'scene-fx--scale',
  scaleY: 'scene-fx--scale-y',
  rotate: 'scene-fx--rotate',
  opacity: 'scene-fx--fade',
  offset: 'scene-fx--draw',
}

/** Solo las variables de los canales de una parte (los hijos las heredan). */
function fxVars(part: string, ...channels: SceneChannel[]) {
  return Object.fromEntries(
    channels.map((channel) => [CHANNEL_VARIABLE[channel], sceneVariableReference(props.kind, part, channel)]),
  )
}

/** Variables y clases que las aplican a este elemento. */
function fx(part: string, ...channels: SceneChannel[]) {
  return { class: [...new Set(channels.map((channel) => CHANNEL_CLASS[channel]))], style: fxVars(part, ...channels) }
}

/* Skills: levels of the radar "Skill profile" of the data (same order of axes); the bars, the same areas. */
const levels = computed(() => cv.value.skillProfile.map((axis) => axis.level))
const radarData = computed(() => radarPoints(levels.value))
const radarGuides = computed(() => RADAR.guideShares.map((share) => svgPoints(radarPoints(levels.value.map(() => share)))))
const radarAxes = computed(() => {
  const outer = radarPoints(levels.value.map(() => 1))
  const half = outer.length / 2
  return outer.slice(0, half).map(([x, y], index) => `M${x} ${y}L${outer[index + half]![0]} ${outer[index + half]![1]}`)
})
const bars = computed(() =>
  levels.value.map((level, index) => {
    const height = BARS.maxHeight * level
    return { x: BARS.firstX + BARS.step * index, y: BARS.baseY - height, height }
  }),
)
const profileFieldTokens = PROFILE_FIELD_LINES.flatMap((tokens, line) =>
  tokens.map(([x, length, tone], token) => ({
    part: `field-${line}-${token}`,
    d: `M${x} ${PROFILE_FICHE_LINE.firstY + PROFILE_FICHE_LINE.step * line}H${x + length}`,
    tone,
  })),
)
const profileChromeY = PROFILE_FICHE_WINDOW.y + 6
const profileCheck = computed(() => {
  const x = PROFILE_FICHE_WINDOW.x + PROFILE_FICHE_WINDOW.width - 16
  const y = PROFILE_FICHE_WINDOW.y + 16
  return `${x - 5},${y} ${x - 1},${y + 4} ${x + 5},${y - 3}`
})
const viewfinder = PROFILE_VIEWFINDER

const BAR_CAP_INSET = 1.5
const FLASH_RADIUS = 12
const FLASH_WAIST = 0.28
/** 4-pointed star at the vertex of the Front End (the first). */
const flashPath = computed(() => {
  const [x, y] = radarData.value[0]!
  const r = FLASH_RADIUS
  const w = FLASH_RADIUS * FLASH_WAIST
  return `M${x} ${y - r}L${x + w} ${y - w}L${x + r} ${y}L${x + w} ${y + w}L${x} ${y + r}L${x - w} ${y + w}L${x - r} ${y}L${x - w} ${y - w}Z`
})

/* Experience */
const experienceLine = svgPoints(EXPERIENCE_POINTS)
const jumpingNodes = EXPERIENCE_POINTS.slice(0, EXPERIENCE_JUMPING_NODES)
const milestone = EXPERIENCE_POINTS.at(-1)!
const TRAIL_DASHARRAY = `${EXPERIENCE_TRAIL_SHARE} 2`

/* Education */
const steps = EDUCATION_STEPS.heights.map((height, index) => ({
  x: EDUCATION_STEPS.firstX + EDUCATION_STEPS.step * index,
  y: EDUCATION_STEPS.baseY - height,
  height,
}))

/* Projects */
const codeTokens = CODE_LINES.flatMap((tokens, line) =>
  tokens.map(([x, length, tone], token) => ({
    part: `code-${line}-${token}`,
    d: `M${x} ${CODE_LINE.firstY + CODE_LINE.step * line}H${x + length}`,
    tone,
  })),
)
const lastToken = CODE_LINES.at(-1)!.at(-1)!
const cursor = { x: lastToken[0] + lastToken[1] + CURSOR_GAP, y: CODE_LINE.firstY + CODE_LINE.step * (CODE_LINES.length - 1) }
const TOP_BLOCK = STACK_BLOCKS_Y.length - 1
</script>

<template>
  <figure class="journey-scene" :data-scene="props.kind" aria-hidden="true" data-testid="journey-scene">
    <svg :viewBox="VIEWBOX" preserveAspectRatio="xMidYMid meet" fill="none" aria-hidden="true" focusable="false">
      <template v-if="kind === 'profile'">
        <g class="journey-scene__profile-viewfinder" aria-hidden="true">
          <path
            class="s-acc"
            :d="`M${viewfinder.x} ${viewfinder.y + viewfinder.arm}V${viewfinder.y}H${viewfinder.x + viewfinder.arm}`"
            stroke-width="1.75"
          />
          <path
            class="s-acc"
            :d="`M${viewfinder.x + viewfinder.width - viewfinder.arm} ${viewfinder.y}H${viewfinder.x + viewfinder.width}V${viewfinder.y + viewfinder.arm}`"
            stroke-width="1.75"
          />
          <path
            class="s-acc"
            :d="`M${viewfinder.x} ${viewfinder.y + viewfinder.height - viewfinder.arm}V${viewfinder.y + viewfinder.height}H${viewfinder.x + viewfinder.arm}`"
            stroke-width="1.75"
          />
          <path
            class="s-acc"
            :d="`M${viewfinder.x + viewfinder.width - viewfinder.arm} ${viewfinder.y + viewfinder.height}H${viewfinder.x + viewfinder.width}V${viewfinder.y + viewfinder.height - viewfinder.arm}`"
            stroke-width="1.75"
          />
        </g>
        <g class="journey-scene__profile-fiche" v-bind="fx('window', 'scale', 'opacity')">
          <rect
            class="f-tint-soft s-main"
            :x="PROFILE_FICHE_WINDOW.x"
            :y="PROFILE_FICHE_WINDOW.y"
            :width="PROFILE_FICHE_WINDOW.width"
            :height="PROFILE_FICHE_WINDOW.height"
            rx="10"
            stroke-width="2"
          />
          <path
            class="s-main"
            :d="`M${PROFILE_FICHE_WINDOW.x} ${PROFILE_FICHE_WINDOW.chromeY}H${PROFILE_FICHE_WINDOW.x + PROFILE_FICHE_WINDOW.width}`"
            stroke-width="1.5"
          />
          <circle class="f-acc" :cx="PROFILE_FICHE_WINDOW.x + 12" :cy="profileChromeY" r="2.5" />
          <circle class="f-main" :cx="PROFILE_FICHE_WINDOW.x + 22" :cy="profileChromeY" r="2.5" />
          <circle class="f-main" :cx="PROFILE_FICHE_WINDOW.x + 32" :cy="profileChromeY" r="2.5" />
          <!-- Frame type corners (static, option F). -->
          <path
            class="s-track journey-scene__profile-corner"
            :d="`M${PROFILE_FICHE_WINDOW.x + 6} ${PROFILE_FICHE_WINDOW.chromeY + 6}V${PROFILE_FICHE_WINDOW.chromeY + 16}H${PROFILE_FICHE_WINDOW.x + 16}`"
            stroke-width="1.5"
          />
          <path
            class="s-track journey-scene__profile-corner"
            :d="`M${PROFILE_FICHE_WINDOW.x + PROFILE_FICHE_WINDOW.width - 6} ${PROFILE_FICHE_WINDOW.chromeY + 6}V${PROFILE_FICHE_WINDOW.chromeY + 16}H${PROFILE_FICHE_WINDOW.x + PROFILE_FICHE_WINDOW.width - 16}`"
            stroke-width="1.5"
          />
          <path
            class="s-track journey-scene__profile-corner"
            :d="`M${PROFILE_FICHE_WINDOW.x + 6} ${PROFILE_FICHE_WINDOW.y + PROFILE_FICHE_WINDOW.height - 6}V${PROFILE_FICHE_WINDOW.y + PROFILE_FICHE_WINDOW.height - 16}H${PROFILE_FICHE_WINDOW.x + 16}`"
            stroke-width="1.5"
          />
          <path
            class="s-track journey-scene__profile-corner"
            :d="`M${PROFILE_FICHE_WINDOW.x + PROFILE_FICHE_WINDOW.width - 6} ${PROFILE_FICHE_WINDOW.y + PROFILE_FICHE_WINDOW.height - 6}V${PROFILE_FICHE_WINDOW.y + PROFILE_FICHE_WINDOW.height - 16}H${PROFILE_FICHE_WINDOW.x + PROFILE_FICHE_WINDOW.width - 16}`"
            stroke-width="1.5"
          />
        </g>
        <path
          v-for="token in profileFieldTokens"
          :key="token.part"
          :class="`s-${token.tone}`"
          v-bind="fx(token.part, 'offset')"
          :d="token.d"
          pathLength="1"
          stroke-width="4"
        />
        <rect
          class="f-tint-soft s-track"
          :x="PROFILE_PROGRESS_BAR.x"
          :y="PROFILE_PROGRESS_BAR.y"
          :width="PROFILE_PROGRESS_BAR.width"
          :height="PROFILE_PROGRESS_BAR.height"
          rx="3"
          stroke-width="1.5"
        />
        <rect
          class="journey-scene__profile-progress f-acc s-main"
          v-bind="fx('progress', 'scale')"
          :x="PROFILE_PROGRESS_BAR.x"
          :y="PROFILE_PROGRESS_BAR.y"
          :width="Math.round(PROFILE_PROGRESS_BAR.width * PROFILE_PROGRESS_BAR.fillShare)"
          :height="PROFILE_PROGRESS_BAR.height"
          rx="3"
          stroke-width="0"
        />
        <circle
          class="f-tint-soft s-track"
          :cx="PROFILE_FICHE_WINDOW.x + PROFILE_FICHE_WINDOW.width - 16"
          :cy="PROFILE_FICHE_WINDOW.y + 16"
          r="9"
          stroke-width="1.5"
        />
        <polyline
          class="s-acc"
          v-bind="fx('check', 'offset')"
          :points="profileCheck"
          pathLength="1"
          stroke-width="2.25"
        />
      </template>

      <template v-else-if="kind === 'skills'">
        <polygon class="s-track" :points="radarGuides[0]" stroke-width="2" />
        <polygon class="s-track" :points="radarGuides[1]" stroke-width="1.5" />
        <path v-for="d in radarAxes" :key="d" class="s-track" :d="d" stroke-width="1.5" />
        <g class="journey-scene__radar" v-bind="fx('radar', 'scale')">
          <polygon class="f-tint s-main" :points="svgPoints(radarData)" stroke-width="3" />
          <g v-bind="fx('vertices', 'opacity')">
            <circle v-for="([x, y], index) in radarData" :key="index" class="f-main" :cx="x" :cy="y" r="3.5" />
          </g>
        </g>
        <path class="s-track" d="M118 93H276" stroke-width="2" />
        <g
          v-for="(bar, index) in bars"
          :key="index"
          :style="{ ...fxVars(`bar-${index}`, 'scaleY'), '--bar-height': bar.height }"
        >
          <rect class="journey-scene__bar f-tint s-main" :x="bar.x" :y="bar.y" :width="BARS.width" :height="bar.height" rx="3" stroke-width="2.5" />
          <path class="journey-scene__bar-cap s-main" :d="`M${bar.x} ${bar.y + BAR_CAP_INSET}H${bar.x + BARS.width}`" stroke-width="3.5" />
          <path
            v-if="index === 0"
            class="s-acc"
            v-bind="fx('accent-cap', 'opacity')"
            :d="`M${bar.x} ${bar.y + BAR_CAP_INSET}H${bar.x + BARS.width}`"
            stroke-width="3.5"
          />
        </g>
        <path class="f-acc s-surf" v-bind="fx('flash', 'scale', 'opacity')" :d="flashPath" stroke-width="1" />
      </template>

      <template v-else-if="kind === 'experience'">
        <polyline class="s-track" :points="experienceLine" stroke-width="2" stroke-dasharray="2 6" />
        <polyline
          class="journey-scene__trail s-main"
          v-bind="fx('trail', 'offset', 'opacity')"
          :points="experienceLine"
          pathLength="1"
          :style="{ strokeDasharray: TRAIL_DASHARRAY }"
          stroke-opacity="0.3"
          stroke-width="12"
        />
        <polyline class="journey-scene__line s-main" v-bind="fx('line', 'offset')" :points="experienceLine" pathLength="1" stroke-width="3.5" />
        <template v-for="([x, y], index) in jumpingNodes" :key="index">
          <circle class="f-surf s-track" :cx="x" :cy="y" :r="EXPERIENCE_RADII.node" stroke-width="2" />
          <circle class="f-main s-surf" v-bind="fx(`node-${index}`, 'y', 'scale', 'opacity')" :cx="x" :cy="y" :r="EXPERIENCE_RADII.node" stroke-width="2" />
        </template>
        <circle class="f-surf s-track" :cx="milestone[0]" :cy="milestone[1]" :r="EXPERIENCE_RADII.node" stroke-width="2" />
        <circle class="s-acc" v-bind="fx('outer-ring', 'scale', 'opacity')" :cx="milestone[0]" :cy="milestone[1]" :r="EXPERIENCE_RADII.outerRing" stroke-width="2" />
        <circle class="s-acc" v-bind="fx('inner-ring', 'scale', 'opacity')" :cx="milestone[0]" :cy="milestone[1]" :r="EXPERIENCE_RADII.innerRing" stroke-width="2.5" />
        <circle class="f-acc" v-bind="fx('milestone', 'scale')" :cx="milestone[0]" :cy="milestone[1]" :r="EXPERIENCE_RADII.milestone" />
      </template>

      <template v-else-if="kind === 'education'">
        <path class="s-track" d="M16 94H264" stroke-width="2" />
        <rect
          v-for="(step, index) in steps"
          :key="`slot-${index}`"
          class="s-track"
          :x="step.x"
          :y="step.y"
          :width="EDUCATION_STEPS.width"
          :height="step.height"
          rx="3"
          stroke-width="1.5"
          stroke-dasharray="3 5"
        />
        <g v-for="(step, index) in steps" :key="`step-${index}`" v-bind="fx(`step-${index}`, 'y', 'opacity')">
          <rect class="f-tint s-main" :x="step.x" :y="step.y" :width="EDUCATION_STEPS.width" :height="step.height" rx="3" stroke-width="2.5" />
          <path class="s-main" :d="`M${step.x} ${step.y + BAR_CAP_INSET}H${step.x + EDUCATION_STEPS.width}`" stroke-width="3.5" />
        </g>
        <g v-bind="fx('cap', 'y', 'opacity')">
          <path class="f-tint s-main" d="M184 16L208 6L232 16L208 26Z" stroke-width="3" />
          <path class="s-main" d="M192 20V27Q208 34 224 27V20" stroke-width="3" />
          <g class="journey-scene__tassel" v-bind="fx('tassel', 'rotate')">
            <path class="s-acc" d="M232 16V31" stroke-width="3" />
            <circle class="f-acc" cx="232" cy="33" r="3.5" />
          </g>
        </g>
      </template>

      <template v-else>
        <g v-bind="fx('window', 'scale', 'opacity')">
          <rect class="f-tint-soft s-main" x="6" y="6" width="160" height="88" rx="8" stroke-width="3" />
          <path class="s-main" d="M6 22H166" stroke-width="2" />
          <circle class="f-acc" cx="18" cy="14" r="3" />
          <circle class="f-main" cx="28" cy="14" r="3" />
          <circle class="f-main" cx="38" cy="14" r="3" />
        </g>
        <path
          v-for="token in codeTokens"
          :key="token.part"
          :class="`s-${token.tone}`"
          v-bind="fx(token.part, 'offset')"
          :d="token.d"
          pathLength="1"
          stroke-width="4"
        />
        <rect class="f-acc" v-bind="fx('cursor', 'x', 'y', 'opacity')" :x="cursor.x" :y="cursor.y - 6" width="3.5" height="12" rx="1" />
        <path class="s-main" v-bind="fx('arrow', 'offset')" d="M172 50H190" pathLength="1" stroke-width="3" />
        <path class="s-main" v-bind="fx('arrow-head', 'opacity')" d="M184 44L191 50L184 56" stroke-width="3" />
        <path class="s-track" d="M196 94H272" stroke-width="2" />
        <g v-for="(y, index) in STACK_BLOCKS_Y" :key="y" v-bind="fx(`block-${index}`, 'y', 'opacity')">
          <rect class="f-tint" :class="index === TOP_BLOCK ? 's-acc' : 's-main'" x="198" :y="y" width="72" height="18" rx="4" stroke-width="2.5" />
          <path v-if="index !== TOP_BLOCK" class="s-main" :d="`M206 ${y + 9}H226`" stroke-width="2.5" />
        </g>
        <polyline class="s-acc" v-bind="fx('check', 'offset')" points="226,39 232,45 244,33" pathLength="1" stroke-width="3" />
      </template>
    </svg>
  </figure>
</template>

<style>
/*
 * Scene (Tanda G): full width under the title, 336×120 on desktop and 224×80 (meet) on mobile.
 * Colors: brand and theme amber; guides in a gray of their own (≥ 3:1 on the card, spec §3).
 */
.journey-scene {
  --g-main: var(--ui-primary);
  --g-acc: var(--accent);
  --g-track: #8c959f;
  --g-surf: var(--ui-bg-elevated);
  --g-tint: 0.12;
  margin: 0.5rem 0 0;
  inline-size: 100%;
  block-size: clamp(80px, 5.5vw + 58px, 120px);
}

.dark .journey-scene {
  --g-track: #6e7681;
  --g-tint: 0.18;
}

@media (max-height: 640px) {
  .journey-scene {
    block-size: 64px;
  }
}

.journey-scene svg {
  display: block;
  inline-size: 100%;
  block-size: 100%;
  overflow: visible;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.journey-scene .s-main {
  stroke: var(--g-main);
}

.journey-scene .s-acc {
  stroke: var(--g-acc);
}

.journey-scene .s-track {
  stroke: var(--g-track);
}

.journey-scene .s-surf {
  stroke: var(--g-surf);
}

.journey-scene .f-main {
  fill: var(--g-main);
}

.journey-scene .f-acc {
  fill: var(--g-acc);
}

.journey-scene .f-surf {
  fill: var(--g-surf);
}

/* Relleno decorativo: el contraste lo da siempre el borde (spec §3). */
.journey-scene .f-tint {
  fill: var(--g-main);
  fill-opacity: var(--g-tint);
}

.journey-scene .f-tint-soft {
  fill: var(--g-main);
  fill-opacity: calc(var(--g-tint) / 2);
}

/* Trazos que se dibujan (pathLength = 1). La estela no forma parte del estado final. */
.journey-scene .scene-fx--draw {
  stroke-dasharray: 1 1;
}

.journey-scene .journey-scene__trail {
  opacity: 0;
}

.journey-scene [class*='scene-fx--'],
.journey-scene .journey-scene__bar {
  transform-box: fill-box;
  transform-origin: center;
}

.journey-scene .journey-scene__radar {
  transform-box: view-box;
  transform-origin: 52px 52px;
}

.journey-scene .journey-scene__bar {
  transform-origin: bottom;
}

.journey-scene .journey-scene__tassel {
  transform-origin: top;
}

/*
 * Con movimiento: cada canal sigue su variable (antes del primer fotograma de JS, su valor de p = 0). Con el foco
 * of the keyboard inside the card, final state. An undrawn stroke is hidden (without the round end point).
 */
:root[data-motion='full'] .journey__card:not(:focus-within) .journey-scene .scene-fx--move {
  translate: calc(var(--scene-x, 0) * 1px) calc(var(--scene-y, 0) * 1px);
}

:root[data-motion='full'] .journey__card:not(:focus-within) .journey-scene .scene-fx--scale {
  scale: var(--scene-scale, 1);
}

:root[data-motion='full'] .journey__card:not(:focus-within) .journey-scene .scene-fx--rotate {
  rotate: calc(var(--scene-rotate, 0) * 1deg);
}

:root[data-motion='full'] .journey__card:not(:focus-within) .journey-scene .scene-fx--draw {
  stroke-dashoffset: var(--scene-offset, 0);
  opacity: clamp(0, (1 - var(--scene-offset, 0)) * 1000, 1);
}

:root[data-motion='full'] .journey__card:not(:focus-within) .journey-scene .scene-fx--fade {
  opacity: var(--scene-opacity, 1);
}

:root[data-motion='full'] .journey__card:not(:focus-within) .journey-scene .journey-scene__trail {
  opacity: var(--scene-opacity, 0);
}

:root[data-motion='full'] .journey__card:not(:focus-within) .journey-scene .journey-scene__bar {
  scale: 1 var(--scene-scale-y, 1);
  opacity: clamp(0, var(--scene-scale-y, 1) * 200, 1);
}

:root[data-motion='full'] .journey__card:not(:focus-within) .journey-scene .journey-scene__bar-cap {
  translate: 0 calc((1 - var(--scene-scale-y, 1)) * var(--bar-height) * 1px);
  opacity: clamp(0, var(--scene-scale-y, 1) * 200, 1);
}

:root[data-motion='full'] .journey__card[data-fx-active] .journey-scene :is(.scene-fx--move, .scene-fx--scale, .scene-fx--rotate, .journey-scene__bar, .journey-scene__bar-cap) {
  will-change: transform;
}

.journey-scene__profile-fiche {
  transform-box: fill-box;
  transform-origin: center;
}

.journey-scene__profile-corner {
  opacity: 0.55;
}

.journey-scene__profile-viewfinder {
  opacity: 0.9;
}

.journey-scene__profile-progress {
  transform-box: fill-box;
  transform-origin: left center;
}

.journey-scene[data-scene='profile'] {
  margin-block: 0.75rem 0.25rem;
}

</style>
