<script setup lang="ts">
/**
 * Holograma wireframe (opción R): figura de malla cyan, pedestal circular con anillos y suelo en rejilla.
 * Piernas y brazos son `<g>` con `transform-box: fill-box` para caminar y señalar; el haz sale de la mano derecha.
 * Estados (solo CSS, con `<html data-motion="full">`): flicker · `walking`/`stepping` · `pointing` (brazo a −100° + haz)
 * · `breathing` · `paused`. Sin movimiento: figura estable y legible en móvil, tablet y escritorio.
 */
defineProps<{ walking?: boolean; stepping?: boolean; pointing?: boolean; breathing?: boolean; paused?: boolean }>()
</script>

<template>
  <svg
    class="holo holo--r"
    :class="{
      'holo--walking': walking,
      'holo--stepping': stepping,
      'holo--pointing': pointing,
      'holo--breathing': breathing,
      'holo--paused': paused,
    }"
    viewBox="0 0 240 480"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="holo-cone" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="currentColor" stop-opacity=".2" />
        <stop offset="1" stop-color="currentColor" stop-opacity="0" />
      </linearGradient>
      <linearGradient id="holo-band" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="currentColor" stop-opacity="0" />
        <stop offset=".45" stop-color="currentColor" stop-opacity=".55" />
        <stop offset="1" stop-color="currentColor" stop-opacity="0" />
      </linearGradient>
      <pattern id="holo-lines" width="6" height="6" patternUnits="userSpaceOnUse">
        <path d="M0 3H6M3 0V6" stroke="currentColor" stroke-opacity=".35" stroke-width=".6" />
      </pattern>
      <pattern id="holo-deck" width="28" height="16" patternUnits="userSpaceOnUse">
        <path d="M0 15H28M14 8V15" stroke="currentColor" stroke-opacity=".18" stroke-width=".75" />
      </pattern>
    </defs>

    <rect class="holo__deck" x="8" y="430" width="224" height="48" />
    <path class="holo__cone" d="M72 448H168L198 28H42Z" fill="url(#holo-cone)" />

    <g class="holo__base">
      <ellipse class="holo__platform holo__platform--outer" cx="120" cy="452" rx="100" ry="15" />
      <ellipse class="holo__platform holo__platform--mid" cx="120" cy="452" rx="74" ry="10" />
      <ellipse class="holo__platform holo__platform--inner" cx="120" cy="452" rx="50" ry="7" />
      <ellipse class="holo__pad" cx="120" cy="452" rx="30" ry="4.5" />
      <ellipse class="holo__glow" cx="120" cy="452" rx="118" ry="20" />
    </g>

    <g class="holo__figure">
      <g class="holo__bob">
        <g id="holo-body" class="holo__body">
          <g class="holo__leg holo__leg--left">
            <path class="holo__trousers" d="M80 250H121L114 418H86Z" />
            <path class="holo__seam" d="M100 260V410" />
            <ellipse class="holo__shoe" cx="99" cy="422" rx="17" ry="6" />
          </g>
          <g class="holo__leg holo__leg--right">
            <path class="holo__trousers" d="M119 250H160L154 418H126Z" />
            <path class="holo__seam" d="M140 260V410" />
            <ellipse class="holo__shoe" cx="141" cy="422" rx="17" ry="6" />
          </g>

          <rect class="holo__skin" x="109" y="98" width="22" height="26" />
          <path class="holo__hood" d="M88 78Q88 48 120 44Q152 48 152 78L146 108Q120 118 94 108Z" />
          <path
            class="holo__shirt"
            d="M100 116L120 142L140 116Q158 118 164 130L162 254H78L76 130Q82 118 100 116Z"
          />
          <path class="holo__collar" d="M100 116L120 142L140 116" />
          <path class="holo__mesh" d="M90 170H150M90 210H150M90 250H150M108 130V254M132 130V254" />

          <g class="holo__arm holo__arm--left">
            <g class="holo__swing">
              <path class="holo__shirt" d="M76 128Q64 132 62 146L54 244H70L76 168Z" />
              <circle class="holo__skin" cx="62" cy="250" r="8" />
            </g>
          </g>
          <g class="holo__arm holo__arm--right">
            <g class="holo__swing">
              <path class="holo__shirt" d="M164 128Q176 132 178 146L186 244H170L164 168Z" />
              <circle class="holo__skin" cx="178" cy="250" r="8" />
              <g class="holo__beam">
                <path class="holo__beam-line" d="M178 246L228 118" pathLength="1" />
                <circle class="holo__beam-dot" cx="228" cy="118" r="5" />
              </g>
            </g>
          </g>

          <ellipse class="holo__skin" cx="89" cy="80" rx="5" ry="9" />
          <ellipse class="holo__skin" cx="151" cy="80" rx="5" ry="9" />
          <ellipse class="holo__skin" cx="120" cy="76" rx="30" ry="34" />
          <g class="holo__glasses">
            <ellipse cx="108" cy="82" rx="11" ry="7" />
            <ellipse cx="132" cy="82" rx="11" ry="7" />
            <path d="M119 82h2" />
          </g>
          <path
            class="holo__hair"
            d="M90 70Q86 42 104 36L98 16L113 31L120 8L128 31L143 15L138 38Q156 46 150 70Q142 52 120 52Q98 52 90 70Z"
          />
        </g>
        <rect class="holo__lines" x="40" y="6" width="160" height="424" fill="url(#holo-lines)" />
      </g>
    </g>
    <use class="holo__echo" href="#holo-body" />
    <rect class="holo__scan" x="40" y="0" width="160" height="36" fill="url(#holo-band)" />
  </svg>
</template>

<style>
/* Opción R: malla cyan; solo opacity y transform en animación. */
.holo {
  --holo-opacity: 0.92;
  --holo-echo-shift: 4px;
  --holo-stride-long: 1.05;
  --holo-stride-short: 0.95;
  --holo-arm-swing: 8deg;
  --holo-bob: -5px;
  --holo-base-step: 0.93;
  --holo-point-angle: -100deg;
  --holo-breathe: -3px;

  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
  color: var(--brand-vivid);
}

.holo__body :is(.holo__skin, .holo__hair, .holo__shirt, .holo__trousers, .holo__shoe, .holo__hood) {
  fill: color-mix(in srgb, var(--brand-vivid) 8%, transparent);
  stroke: currentColor;
  stroke-width: 1.35;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.holo__collar,
.holo__mesh,
.holo__seam,
.holo__glasses :is(ellipse, path) {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.1;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
}

.holo__mesh {
  opacity: 0.55;
}

.holo__glasses {
  opacity: 0.95;
}

.holo__leg,
.holo__arm,
.holo__swing,
.holo__base {
  transform-box: fill-box;
  transform-origin: 50% 0;
}

.holo__base {
  transform-origin: 50% 50%;
}

.holo__deck {
  fill: url(#holo-deck);
  opacity: 0.85;
}

.holo__cone {
  stroke: currentColor;
  stroke-opacity: 0.12;
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.holo__figure {
  opacity: var(--holo-opacity);
}

.holo__lines {
  opacity: 0.45;
}

.holo__platform {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.75;
  vector-effect: non-scaling-stroke;
}

.holo__platform--outer {
  stroke-opacity: 0.85;
}

.holo__platform--mid {
  stroke-opacity: 0.65;
  stroke-dasharray: 4 6;
}

.holo__platform--inner {
  stroke-opacity: 0.95;
  stroke-width: 2;
}

.holo__pad {
  fill: currentColor;
  fill-opacity: 0.55;
  stroke: none;
}

.holo__glow {
  fill: currentColor;
  fill-opacity: 0.07;
  stroke: none;
}

.holo__beam {
  opacity: 0;
  pointer-events: none;
}

.holo--pointing .holo__beam {
  opacity: 1;
}

.holo__beam-line {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-dasharray: 0.08 0.06;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
}

.holo__beam-dot {
  fill: currentColor;
  fill-opacity: 0.35;
  stroke: currentColor;
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
}

.holo__echo,
.holo__scan {
  opacity: 0;
}

:root[data-motion='full'] .holo__scan {
  opacity: 1;
  transform-box: view-box;
  animation: holo-scan var(--holo-scan-duration, 6s) linear infinite;
}

:root[data-motion='full'] .holo__figure {
  animation: holo-flicker var(--holo-flicker-duration, 5s) infinite;
}

:root[data-motion='full'] .holo__echo {
  transform: translateX(var(--holo-echo-shift));
  animation: holo-echo var(--holo-flicker-duration, 5s) infinite;
}

.holo--pointing .holo__arm--right {
  transform: rotate(var(--holo-point-angle));
}

:root[data-motion='full'] .holo__arm--right {
  transition: transform var(--point-duration, 450ms) cubic-bezier(0.34, 1.56, 0.64, 1);
}

:root[data-motion='full'] .holo--pointing .holo__beam-line {
  animation: holo-beam-flow 1.1s linear infinite;
}

:root[data-motion='full'] .holo--pointing .holo__beam-dot {
  animation: holo-beam-pulse 1.1s ease-in-out infinite;
}

:root[data-motion='full'] .holo--walking .holo__leg--left {
  animation: holo-leg-left var(--walk-cycle-duration, 800ms) linear infinite paused;
}

:root[data-motion='full'] .holo--walking .holo__leg--right {
  animation: holo-leg-right var(--walk-cycle-duration, 800ms) linear infinite paused;
}

:root[data-motion='full'] .holo--walking .holo__arm--left .holo__swing {
  animation: holo-arm-left var(--walk-cycle-duration, 800ms) linear infinite paused;
}

:root[data-motion='full'] .holo--walking .holo__arm--right .holo__swing {
  animation: holo-arm-right var(--walk-cycle-duration, 800ms) linear infinite paused;
}

:root[data-motion='full'] .holo--walking .holo__bob {
  animation: holo-bob var(--walk-cycle-duration, 800ms) linear infinite paused;
}

:root[data-motion='full'] .holo--walking .holo__base {
  animation: holo-base-step var(--walk-cycle-duration, 800ms) linear infinite paused;
}

:root[data-motion='full'] .holo--walking.holo--stepping * {
  animation-play-state: running;
}

:root[data-motion='full'] .holo--breathing .holo__bob {
  animation: holo-breathe var(--breathe-duration, 4s) ease-in-out infinite;
}

:root[data-motion='full'] .holo--breathing .holo__platform--outer {
  animation: holo-ring-pulse var(--breathe-duration, 4s) ease-in-out infinite;
}

:root[data-motion='full'] .holo--paused,
:root[data-motion='full'] .holo--paused * {
  animation-play-state: paused;
}

@media (prefers-reduced-motion: reduce) {
  .holo__beam-line,
  .holo__beam-dot {
    animation: none !important;
  }
}

@keyframes holo-leg-left {
  0%,
  100% {
    transform: scaleY(var(--holo-stride-long));
  }

  25%,
  75% {
    transform: none;
  }

  50% {
    transform: scaleY(var(--holo-stride-short));
  }
}

@keyframes holo-leg-right {
  0%,
  100% {
    transform: scaleY(var(--holo-stride-short));
  }

  25%,
  75% {
    transform: none;
  }

  50% {
    transform: scaleY(var(--holo-stride-long));
  }
}

@keyframes holo-arm-left {
  0%,
  100% {
    transform: rotate(var(--holo-arm-swing));
  }

  25%,
  75% {
    transform: none;
  }

  50% {
    transform: rotate(calc(var(--holo-arm-swing) * -1));
  }
}

@keyframes holo-arm-right {
  0%,
  100% {
    transform: rotate(calc(var(--holo-arm-swing) * -1));
  }

  25%,
  75% {
    transform: none;
  }

  50% {
    transform: rotate(var(--holo-arm-swing));
  }
}

@keyframes holo-bob {
  25%,
  75% {
    transform: translateY(var(--holo-bob));
  }
}

@keyframes holo-base-step {
  25%,
  75% {
    transform: scale(var(--holo-base-step));
  }
}

@keyframes holo-breathe {
  50% {
    transform: translateY(var(--holo-breathe));
  }
}

@keyframes holo-ring-pulse {
  50% {
    stroke-opacity: 1;
  }
}

@keyframes holo-flicker {
  0%,
  92%,
  100% {
    opacity: 0.92;
  }

  93% {
    opacity: 0.4;
  }

  95% {
    opacity: 0.95;
  }

  97% {
    opacity: 0.55;
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
    opacity: 0.25;
  }
}

@keyframes holo-scan {
  from {
    transform: translateY(0);
  }

  to {
    transform: translateY(91.67%);
  }
}

@keyframes holo-beam-flow {
  to {
    stroke-dashoffset: -0.28;
  }
}

@keyframes holo-beam-pulse {
  50% {
    fill-opacity: 0.75;
  }
}
</style>
