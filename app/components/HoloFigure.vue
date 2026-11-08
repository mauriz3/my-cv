<script setup lang="ts">
/**
 * Holograma de cuerpo entero (SVG inline, decorativo): pelo negro de punta, piel morena y camisa azul vivo,
 * translúcido, con scanlines y base de proyección con cono de luz.
 * Piernas y brazos son `<g>` con `transform-box: fill-box` (origen en cadera y hombro) para caminar y señalar.
 * Estados (solo CSS, con `<html data-motion="full">`): flicker siempre · `walking` (ciclo de 4 frames, en pausa)
 * · `stepping` (el ciclo avanza) · `pointing` (brazo derecho a −100°) · `breathing` (±3 px) · `paused` (todo quieto).
 * Sin JS o con movimiento reducido: estable, opacidad 0,85 y sin animar.
 */
defineProps<{ walking?: boolean; stepping?: boolean; pointing?: boolean; breathing?: boolean; paused?: boolean }>()
</script>

<template>
  <svg
    class="holo"
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
    </defs>

    <path class="holo__cone" d="M66 452H174L214 24H26Z" fill="url(#holo-cone)" />
    <g class="holo__base">
      <ellipse cx="120" cy="452" rx="92" ry="14" />
      <ellipse cx="120" cy="452" rx="64" ry="9" />
      <ellipse class="holo__pad" cx="120" cy="452" rx="34" ry="5" />
    </g>

    <g class="holo__figure">
      <g class="holo__bob">
        <g id="holo-body" class="holo__body">
          <g class="holo__leg holo__leg--left">
            <path class="holo__trousers" d="M80 250H121L114 418H86Z" />
            <ellipse class="holo__shoe" cx="99" cy="422" rx="17" ry="6" />
          </g>
          <g class="holo__leg holo__leg--right">
            <path class="holo__trousers" d="M119 250H160L154 418H126Z" />
            <ellipse class="holo__shoe" cx="141" cy="422" rx="17" ry="6" />
          </g>
          <rect class="holo__skin" x="109" y="98" width="22" height="26" />
          <path class="holo__shirt" d="M100 116L120 142L140 116Q158 118 164 130L162 254H78L76 130Q82 118 100 116Z" />
          <path class="holo__collar" d="M100 116L120 142L140 116" />
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
            </g>
          </g>
          <ellipse class="holo__skin" cx="89" cy="80" rx="5" ry="9" />
          <ellipse class="holo__skin" cx="151" cy="80" rx="5" ry="9" />
          <ellipse class="holo__skin" cx="120" cy="76" rx="30" ry="34" />
          <path
            class="holo__hair"
            d="M90 70Q86 42 104 36L98 16L113 31L120 8L128 31L143 15L138 38Q156 46 150 70Q142 52 120 52Q98 52 90 70Z"
          />
        </g>
        <rect class="holo__lines" x="44" y="6" width="152" height="424" fill="url(#holo-lines)" />
      </g>
    </g>
    <use class="holo__echo" href="#holo-body" />
    <rect class="holo__scan" x="44" y="0" width="152" height="40" fill="url(#holo-band)" />
  </svg>
</template>

<style>
/* Colores de la paleta azul (Tanda C). Solo se animan opacity y transform. */
.holo {
  --holo-opacity: 0.85;
  --holo-echo-shift: 3px;
  --holo-skin: #8d5a3b;
  --holo-hair: #0d1117;
  --holo-trousers: #0b4766;
  /* Ciclo de caminar (handoff «Holograma C»): zancada, balanceo de brazos, rebote y base. */
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
  color: var(--color-brand-400);
}

.holo__body > *,
.holo__leg > *,
.holo__swing > * {
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linejoin: round;
  fill-opacity: 0.6;
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

/* Eco y barrido solo existen mientras se animan. */
.holo__echo,
.holo__scan {
  opacity: 0;
}

/* Con movimiento (`data-motion="full"`, lo pone el script anterior al pintado). */
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

:root[data-motion='full'] .holo__arm--right {
  transition: transform var(--point-duration, 450ms) cubic-bezier(0.34, 1.56, 0.64, 1);
}

:root[data-motion='full'] .holo--pointing .holo__arm--right {
  transform: rotate(var(--holo-point-angle));
}

/* Caminar: el ciclo está en pausa y solo avanza mientras hay scroll (`stepping`). */
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

/* Fuera de pantalla o con la pestaña oculta: todo quieto. */
:root[data-motion='full'] .holo--paused,
:root[data-motion='full'] .holo--paused * {
  animation-play-state: paused;
}

/* F1 pierna izq. delante · F2 cruce (cuerpo arriba) · F3 pierna der. delante · F4 cruce. */
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

/* La banda (40 de 480 de alto) recorre la figura de arriba abajo sin salirse del lienzo: 440 / 480. */
@keyframes holo-scan {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(91.67%);
  }
}
</style>
