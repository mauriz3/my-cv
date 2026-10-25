<script setup lang="ts">
import { isMotionReduced } from './ReduceMotionToggle.vue'

/**
 * Holograma line-art del hero (SVG inline, decorativo). Fuente: my-cv-plan/hero-demo/hologram.svg.
 * Con movimiento: la persona, la mesa y el código se dibujan al cargar y los destellos laten
 * solo mientras el holograma está en pantalla y la pestaña visible. Sin JS o con menos movimiento: estado final.
 */
const SPARKLE_PATHS = [
  'M130 83L132.25 89.75L139 92L132.25 94.25L130 101L127.75 94.25L121 92L127.75 89.75Z',
  'M300 33L301.75 38.25L307 40L301.75 41.75L300 47L298.25 41.75L293 40L298.25 38.25Z',
  'M458 206L460 212L466 214L460 216L458 222L456 216L450 214L456 212Z',
  'M40 193L41.75 198.25L47 200L41.75 201.75L40 207L38.25 201.75L33 200L38.25 198.25Z',
  'M214 230L215.5 234.5L220 236L215.5 237.5L214 242L212.5 237.5L208 236L212.5 234.5Z',
  'M330 342L332 348L338 350L332 352L330 358L328 352L322 350L328 348Z',
  'M150 446L151.5 450.5L156 452L151.5 453.5L150 458L148.5 453.5L144 452L148.5 450.5Z',
] as const

/** En móvil (< md) solo se muestran los primeros destellos. */
const MOBILE_SPARKLE_COUNT = 4

const NODE_POSITIONS = [
  [168, 124], [148, 198], [202, 198], [252, 250], [304, 262],
  [242, 306], [252, 382], [246, 56], [442, 168], [240, 420],
] as const

const svg = useTemplateRef<SVGSVGElement>('svg')
const isAnimated = ref(false)
const isDrawn = ref(false)
const isOnScreen = ref(false)
const isPageVisible = ref(true)
const isLive = computed(() => isAnimated.value && isOnScreen.value && isPageVisible.value)

let observer: IntersectionObserver | undefined

function updatePageVisibility() {
  isPageVisible.value = !document.hidden
}

/** Dos frames: el navegador pinta primero el trazo oculto y luego anima hasta el dibujo completo. */
function startDrawing() {
  requestAnimationFrame(() => requestAnimationFrame(() => (isDrawn.value = true)))
}

onMounted(() => {
  if (isMotionReduced() || !svg.value) return
  isAnimated.value = true
  startDrawing()
  observer = new IntersectionObserver(([entry]) => (isOnScreen.value = entry?.isIntersecting ?? false))
  observer.observe(svg.value)
  document.addEventListener('visibilitychange', updatePageVisibility)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  document.removeEventListener('visibilitychange', updatePageVisibility)
})
</script>

<template>
  <svg
    ref="svg"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 480 480"
    width="480"
    height="480"
    aria-hidden="true"
    role="presentation"
    focusable="false"
    class="holo"
    :class="{ 'is-animated': isAnimated, 'is-drawn': isDrawn, 'is-live': isLive }"
  >
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <g class="holo__platform">
        <ellipse cx="240" cy="420" rx="180" ry="30" />
        <ellipse cx="240" cy="420" rx="128" ry="20" />
        <ellipse cx="240" cy="420" rx="76" ry="11" />
        <path d="M90 446Q240 478 390 446" />
        <path d="M130 462Q240 484 350 462" />
        <path d="M240 390V450M150 400L120 440M330 400L360 440" stroke-dasharray="3 6" />
      </g>
      <g class="holo__beams" stroke-dasharray="4 8">
        <path d="M84 418V250" />
        <path d="M396 418V268" />
        <path d="M60 410V330" />
        <path d="M420 412V340" />
      </g>
      <g class="holo__draw holo__person">
        <circle cx="168" cy="150" r="26" pathLength="1" />
        <path d="M172 176L176 192" pathLength="1" />
        <path d="M148 198Q174 186 202 198" pathLength="1" />
        <path d="M148 198Q136 256 158 304" pathLength="1" />
        <path d="M202 198Q216 244 210 300" pathLength="1" />
        <path d="M198 206Q226 236 252 250L304 262" pathLength="1" />
        <path d="M158 304L242 306L252 382" pathLength="1" />
        <path d="M252 382L276 382" pathLength="1" />
        <path d="M136 300Q118 244 142 192" pathLength="1" />
        <path d="M128 308H218" pathLength="1" />
        <path d="M172 308V392" pathLength="1" />
        <path d="M146 392H198" pathLength="1" />
      </g>
      <g class="holo__draw holo__desk">
        <path d="M232 280H424" pathLength="1" />
        <path d="M244 280V392M412 280V392" pathLength="1" />
        <path d="M262 278H350" pathLength="1" />
        <path d="M350 278L368 192H378L360 278Z" pathLength="1" />
        <rect x="246" y="56" width="196" height="112" rx="8" pathLength="1" />
        <path d="M266 86H326M280 104H372M280 122H350M266 140H308" pathLength="1" />
      </g>
      <g class="holo__draw holo__code">
        <path d="M72 112Q60 112 60 126V138Q60 146 52 146Q60 146 60 154V166Q60 180 72 180" pathLength="1" />
        <path d="M104 112Q116 112 116 126V138Q116 146 124 146Q116 146 116 154V166Q116 180 104 180" pathLength="1" />
        <path d="M70 232L56 246L70 260M86 262L98 230M112 232L126 246L112 260" pathLength="1" />
        <path d="M378 214L400 252L422 214M390 214L400 232L410 214" pathLength="1" />
        <rect x="404" y="78" width="40" height="40" rx="6" pathLength="1" />
        <path
          d="M416 92V106Q416 110 412 110M424 108Q428 110 432 108Q434 104 430 101Q426 99 426 95Q428 91 433 93"
          pathLength="1"
        />
      </g>
      <g class="holo__nodes">
        <circle v-for="[cx, cy] in NODE_POSITIONS" :key="`${cx}-${cy}`" :cx="cx" :cy="cy" r="3.5" />
      </g>
    </g>
    <g class="holo__sparkles">
      <path
        v-for="(path, index) in SPARKLE_PATHS"
        :key="path"
        class="holo__sparkle"
        :class="{ 'max-md:hidden': index >= MOBILE_SPARKLE_COUNT }"
        :d="path"
        :style="{ '--sparkle-index': index }"
      />
    </g>
  </svg>
</template>

<style>
/* Tiempos del handoff «Hero motion» (Figma). Solo se anima stroke-dashoffset, transform y opacity. */
.holo {
  --holo-draw-duration: 1600ms;
  --holo-desk-delay: 200ms;
  --holo-code-delay: 400ms;
  --holo-ghost-opacity: 0.15;
  --holo-sparkle-duration: 2400ms;
  --holo-sparkle-stagger: 170ms;
  --holo-sparkle-min-scale: 0.4;
  --holo-sparkle-min-opacity: 0.4;
  --holo-tilt: -12deg;
  --holo-perspective: 800px;
  --holo-glow: 3px;

  width: 100%;
  height: auto;
  color: var(--ui-primary);
  /* Glow estático: nunca se anima filter ni blur. */
  filter: drop-shadow(0 0 var(--holo-glow) color-mix(in srgb, var(--ui-primary) 55%, transparent));
}

.holo__sparkle {
  fill: var(--ui-secondary);
  transform-box: fill-box;
  transform-origin: center;
}

/* Trazo: solo existe el estado oculto cuando el JS ha decidido animar. */
.holo.is-animated .holo__draw > * {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  opacity: var(--holo-ghost-opacity);
  transition:
    stroke-dashoffset var(--holo-draw-duration) ease-in-out var(--holo-draw-delay, 0ms),
    opacity var(--holo-draw-duration) ease-in-out var(--holo-draw-delay, 0ms);
}

.holo__desk {
  --holo-draw-delay: var(--holo-desk-delay);
}

.holo__code {
  --holo-draw-delay: var(--holo-code-delay);
}

.holo.is-drawn .holo__draw > * {
  stroke-dashoffset: 0;
  opacity: 1;
}

.holo.is-live .holo__sparkle {
  animation: holo-sparkle var(--holo-sparkle-duration) ease-in-out infinite;
  animation-delay: calc(var(--sparkle-index, 0) * var(--holo-sparkle-stagger));
}

@keyframes holo-sparkle {
  50% {
    transform: scale(var(--holo-sparkle-min-scale));
    opacity: var(--holo-sparkle-min-opacity);
  }
}

/* Escritorio (breakpoint xl = 1280 px; las media queries no admiten variables CSS): el holograma gira hacia el frente al hacer scroll (sin JS). */
@supports (animation-timeline: view()) {
  @media (min-width: 1280px) {
    .holo.is-animated {
      animation: holo-tilt linear both;
      animation-timeline: view();
      animation-range: entry 0% cover 50%;
    }
  }
}

@keyframes holo-tilt {
  from {
    transform: perspective(var(--holo-perspective)) rotateY(var(--holo-tilt));
  }
  to {
    transform: none;
  }
}

/* Menos movimiento (sistema o botón): estado final estático y sin destellos. */
@media (prefers-reduced-motion: reduce) {
  .holo__sparkles {
    display: none;
  }
}

.reduce-motion .holo {
  animation: none;
}

.reduce-motion .holo__sparkles {
  display: none;
}

.reduce-motion .holo .holo__draw > * {
  stroke-dashoffset: 0;
  opacity: 1;
  transition: none;
}
</style>
