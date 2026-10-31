<script setup lang="ts">
/**
 * Holograma de cuerpo entero (SVG inline, decorativo, Tanda C): pelo negro de punta, piel morena,
 * camisa azul vivo, todo translúcido con scanlines y base de proyección con cono de luz.
 * Estados (solo CSS): estable · `holo--flicker` (parpadeo + eco) · `holo--glitch` (pérdida de señal).
 * `holo--paused` congela las animaciones (fuera de pantalla o pestaña oculta).
 * Sin JS o con menos movimiento: estable, opacidad 0,85 y sin animar.
 */
defineProps<{ flicker?: boolean; glitch?: boolean; paused?: boolean }>()

/** Franjas de la pérdida de señal (y, alto en unidades del viewBox; desplazamiento en px del handoff). */
const GLITCH_SLICES = [
  { y: 110, height: 60, shiftPx: 14 },
  { y: 230, height: 50, shiftPx: -12 },
  { y: 330, height: 40, shiftPx: 8 },
] as const
</script>

<template>
  <svg
    class="holo"
    :class="{ 'holo--flicker': flicker, 'holo--glitch': glitch, 'holo--paused': paused }"
    viewBox="0 0 240 480"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="holo-cone" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="currentColor" stop-opacity=".35" />
        <stop offset="1" stop-color="currentColor" stop-opacity="0" />
      </linearGradient>
      <linearGradient id="holo-band" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="currentColor" stop-opacity="0" />
        <stop offset=".5" stop-color="currentColor" stop-opacity=".45" />
        <stop offset="1" stop-color="currentColor" stop-opacity="0" />
      </linearGradient>
      <pattern id="holo-lines" width="4" height="4" patternUnits="userSpaceOnUse">
        <path d="M0 .5H4" stroke="currentColor" stroke-opacity=".45" />
      </pattern>
      <g id="holo-body" class="holo__body">
        <path class="holo__trousers" d="M80 250H160L154 418H128L120 300L112 418H86Z" />
        <ellipse class="holo__shoe" cx="99" cy="422" rx="17" ry="6" />
        <ellipse class="holo__shoe" cx="141" cy="422" rx="17" ry="6" />
        <circle class="holo__skin" cx="62" cy="250" r="8" />
        <circle class="holo__skin" cx="178" cy="250" r="8" />
        <rect class="holo__skin" x="109" y="98" width="22" height="26" />
        <path
          class="holo__shirt"
          d="M100 116L120 142L140 116Q168 120 176 142L186 244H170L164 166L162 254H78L76 166L70 244H54L64 142Q72 120 100 116Z"
        />
        <path class="holo__collar" d="M100 116L120 142L140 116" />
        <ellipse class="holo__skin" cx="89" cy="80" rx="5" ry="9" />
        <ellipse class="holo__skin" cx="151" cy="80" rx="5" ry="9" />
        <ellipse class="holo__skin" cx="120" cy="76" rx="30" ry="34" />
        <path
          class="holo__hair"
          d="M90 70Q86 42 104 36L98 16L113 31L120 8L128 31L143 15L138 38Q156 46 150 70Q142 52 120 52Q98 52 90 70Z"
        />
      </g>
    </defs>

    <path class="holo__cone" d="M66 452H174L214 24H26Z" fill="url(#holo-cone)" />
    <g class="holo__base">
      <ellipse cx="120" cy="452" rx="92" ry="14" />
      <ellipse cx="120" cy="452" rx="64" ry="9" />
      <ellipse class="holo__pad" cx="120" cy="452" rx="34" ry="5" />
    </g>

    <g class="holo__figure">
      <use href="#holo-body" />
      <rect class="holo__lines" x="44" y="6" width="152" height="424" fill="url(#holo-lines)" />
    </g>
    <use class="holo__echo" href="#holo-body" />
    <use
      v-for="slice in GLITCH_SLICES"
      :key="slice.y"
      class="holo__slice"
      href="#holo-body"
      :style="{ '--slice-top': `${slice.y}px`, '--slice-height': `${slice.height}px`, '--slice-shift': `${slice.shiftPx}px` }"
    />
    <rect class="holo__scan" x="44" y="0" width="152" height="40" fill="url(#holo-band)" />
  </svg>
</template>

<style>
/* Colores de la paleta azul (Tanda C). Solo se animan opacity, transform y clip-path. */
.holo {
  --holo-opacity: 0.85;
  --holo-echo-shift: 3px;
  --holo-skin: #8d5a3b;
  --holo-hair: #0d1117;
  --holo-trousers: #0b4766;

  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
  color: var(--color-brand-400);
}

.holo__body > * {
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linejoin: round;
  fill-opacity: 0.6;
}

.holo__skin {
  fill: var(--holo-skin);
}

.holo__hair {
  fill: var(--holo-hair);
  fill-opacity: 0.9;
}

.holo__shirt {
  fill: var(--brand-vivid);
}

.holo__collar {
  fill: none;
}

.holo__trousers,
.holo__shoe {
  fill: var(--holo-trousers);
}

.holo__figure {
  opacity: var(--holo-opacity);
}

.holo__lines {
  opacity: 0.6;
}

.holo__base ellipse {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

.holo__base .holo__pad {
  fill: currentColor;
  fill-opacity: 0.5;
}

/* Eco, franjas y barrido solo existen mientras se animan. */
.holo__echo,
.holo__slice,
.holo__scan {
  opacity: 0;
}

.holo__slice {
  clip-path: inset(var(--slice-top) 0 calc(100% - var(--slice-top) - var(--slice-height)) 0);
}

/* Con movimiento (sistema sin «reduce», botón apagado y JS activo). */
@media (prefers-reduced-motion: no-preference) {
  :root.has-js:not(.reduce-motion) .holo__scan {
    opacity: 1;
    transform-box: view-box;
    animation: holo-scan var(--holo-scan-duration, 6s) linear infinite;
  }

  :root.has-js:not(.reduce-motion) .holo--flicker .holo__figure {
    animation: holo-flicker var(--holo-flicker-duration, 5s) infinite;
  }

  :root.has-js:not(.reduce-motion) .holo--flicker .holo__echo {
    transform: translateX(var(--holo-echo-shift));
    animation: holo-echo var(--holo-flicker-duration, 5s) infinite;
  }

  :root.has-js:not(.reduce-motion) .holo--glitch .holo__figure {
    animation: holo-dropout var(--holo-glitch-duration, 0.4s) steps(1) 1;
  }

  :root.has-js:not(.reduce-motion) .holo--glitch .holo__slice {
    animation: holo-glitch var(--holo-glitch-duration, 0.4s) steps(1) 1;
  }

  :root.has-js:not(.reduce-motion) .holo--paused * {
    animation-play-state: paused;
  }
}

/* Flicker: 160 ms de parpadeo dentro de un ciclo de 5 s (92 %→100 %). */
@keyframes holo-flicker {
  0%,
  92%,
  100% {
    opacity: 0.85;
  }
  93% {
    opacity: 0.35;
  }
  95% {
    opacity: 0.9;
  }
  97% {
    opacity: 0.5;
  }
}

@keyframes holo-echo {
  0%,
  92%,
  100% {
    opacity: 0;
  }
  93%,
  97% {
    opacity: 0.3;
  }
}

@keyframes holo-scan {
  from {
    transform: translateY(-100%);
  }
  to {
    transform: translateY(100%);
  }
}

/* Pérdida de señal: el cuerpo cae (dropout) mientras las franjas se desplazan (+14 / −12 / +8 px). */
@keyframes holo-dropout {
  0% {
    opacity: 0.2;
  }
  75% {
    opacity: 0.5;
  }
  100% {
    opacity: 0.85;
  }
}

@keyframes holo-glitch {
  0% {
    opacity: 0.9;
    transform: translateX(var(--slice-shift));
  }
  25% {
    transform: translateX(calc(var(--slice-shift) * -1));
  }
  50% {
    transform: translateX(calc(var(--slice-shift) / 2));
  }
  75% {
    opacity: 0.2;
  }
  100% {
    opacity: 0;
    transform: none;
  }
}
</style>
