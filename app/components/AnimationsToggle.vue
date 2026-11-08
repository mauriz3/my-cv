<script setup lang="ts">
import {
  PULSE_CYCLE_MS,
  PULSE_DELAY_MS,
  PULSE_HALO_SCALE,
  PULSE_ITERATIONS,
  PULSE_SCALE,
  ANIMATIONS_HINT_KEY,
  shouldPulse,
  shouldStopPulse,
} from '~~/lib/animations'
import { registerPulseStop, useAnimations } from '~/composables/useAnimations'

/**
 * Global animations button, in the header of all pages, between the links and ES/EN.
 * Off (static): amber and play, “Activate animations”. ON: neutral and pause, “Disable animations”.
 * No aria-pressed: the accessible name is the copy of the action. Desktop displays text;
 * por debajo de 1024 px solo el icono de 44×44 y un tooltip con el mismo texto.
 * The two tags are in the DOM and the CSS shows the one that corresponds to data-motion, without blinking.
 * The first visit without choice presses the button with a ring; it stops when pressed, focus it, hide the tab or finish.
 */
const { t } = useI18n({ useScope: 'local' })
const { motion, stored, prefersReducedMotion, toggle } = useAnimations()

/**
 * On the server and before hydrating, the copy of off is valid: the HTML starts static.
 * After mounting, it is aligned with the effective state (also in EN).
 */
const label = ref(t('enable'))
/** Empty until the first press: this way nothing is announced when loading. */
const announcement = ref('')
/** Escape hides the tooltip until you exit the button (WCAG 1.4.13). */
const isTooltipDismissed = ref(false)
const hint = ref(false)

const hintStyle = {
  '--hint-cycle': `${PULSE_CYCLE_MS}ms`,
  '--hint-delay': `${PULSE_DELAY_MS}ms`,
  '--hint-count': String(PULSE_ITERATIONS),
  '--hint-scale': String(PULSE_SCALE),
  '--hint-halo-scale': String(PULSE_HALO_SCALE),
}

let hintController: AbortController | undefined

function stopHint() {
  hint.value = false
  hintController?.abort()
  hintController = undefined
}

registerPulseStop(stopHint)

function syncLabel() {
  label.value = motion.value === 'full' ? t('disable') : t('enable')
}

watch(motion, syncLabel)

function onClick() {
  toggle()
  announcement.value = t(motion.value === 'full' ? 'enabled' : 'disabled')
}

function readHintShown() {
  try {
    return sessionStorage.getItem(ANIMATIONS_HINT_KEY) === 'shown'
  } catch {
    return true
  }
}

function rememberHint() {
  try {
    sessionStorage.setItem(ANIMATIONS_HINT_KEY, 'shown')
  } catch {
    // Sin sessionStorage el pulso de esta carga no se recuerda; no se reintenta al fallar.
  }
}

/** Tap, focus, or finish the animation. The scroll and the knocks out don't come here. */
function onHintSignal(event: Event) {
  const animationName = event instanceof AnimationEvent ? event.animationName : undefined
  if (shouldStopPulse({ type: event.type, onToggle: true, animationName })) stopHint()
}

function onVisibilityChange() {
  if (shouldStopPulse({ type: 'visibilitychange', onToggle: false, hidden: document.hidden })) stopHint()
}

onMounted(() => {
  syncLabel()
  if (
    !shouldPulse({
      stored: stored.value,
      prefersReducedMotion: prefersReducedMotion.value,
      hintShown: readHintShown(),
      visible: document.visibilityState === 'visible',
    })
  ) {
    return
  }
  rememberHint()
  hint.value = true
  hintController = new AbortController()
  document.addEventListener('visibilitychange', onVisibilityChange, { signal: hintController.signal })
})

onBeforeUnmount(stopHint)
</script>

<template>
  <span class="contents">
    <button
      type="button"
      class="animations-toggle cta-halo"
      :class="{ 'animations-toggle--tooltip-off': isTooltipDismissed }"
      :style="hintStyle"
      :data-hint="hint ? '' : undefined"
      :aria-label="label"
      data-testid="animations-toggle"
      @click="onClick"
      @pointerdown="onHintSignal"
      @focus="onHintSignal"
      @animationend="onHintSignal"
      @keydown.esc="isTooltipDismissed = true"
      @blur="isTooltipDismissed = false"
      @mouseleave="isTooltipDismissed = false"
    >
      <span class="animations-toggle__stack" aria-hidden="true">
        <UIcon name="i-lucide-play" class="animations-toggle__icon animations-toggle__when-off" />
        <UIcon name="i-lucide-pause" class="animations-toggle__icon animations-toggle__when-on" />
      </span>
      <span class="animations-toggle__labels animations-toggle__stack">
        <span class="animations-toggle__when-off">{{ t('enable') }}</span>
        <span class="animations-toggle__when-on">{{ t('disable') }}</span>
      </span>
      <span class="animations-toggle__tooltip" aria-hidden="true" data-testid="animations-tooltip">{{ label }}</span>
    </button>
    <span class="sr-only" aria-live="polite" data-testid="animations-announcement">{{ announcement }}</span>
  </span>
</template>

<style>
/* Animation button measurements (Figma 140:7553). Color is decided by data-motion, not a Vue class. */
.animations-toggle {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 44px;
  padding-inline: 1rem;
  border: 2px solid var(--ui-border);
  border-radius: 0.5rem;
  background: var(--ui-bg-elevated);
  color: var(--ui-text);
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
  transform-origin: center;
  --hint-ring-width: 2px;
  transition:
    background-color 150ms,
    color 150ms,
    border-color 150ms;
}

.animations-toggle__icon {
  width: 1rem;
  height: 1rem;
}

/* The two copies occupy the same place: the button reserves the width of the longest one. */
.animations-toggle__stack {
  display: inline-grid;
}

.animations-toggle__stack > * {
  grid-area: 1 / 1;
}

.animations-toggle__labels {
  justify-items: center;
}

:root[data-motion='full'] .animations-toggle__when-off,
:root:not([data-motion='full']) .animations-toggle__when-on {
  visibility: hidden;
}

/* Off: Amber. The 2px border is already reserved; at rest it is the same color as the fill. */
:root:not([data-motion='full']) .animations-toggle,
:root:not([data-motion='full']) .animations-toggle:hover {
  background: var(--ui-secondary);
  border-color: var(--ui-secondary);
  color: var(--ui-text-inverted);
}

:root:not([data-motion='full']) .animations-toggle:hover {
  border-color: var(--ui-text);
  text-decoration: underline;
  text-underline-offset: 4px;
}

/* ON: hover con el primario sobre brand-soft. */
:root[data-motion='full'] .animations-toggle:hover {
  background: var(--brand-soft);
  border-color: var(--ui-primary);
  color: var(--ui-primary);
}

.animations-toggle:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
  box-shadow: 0 0 0 6px var(--brand-soft);
}

.animations-toggle__tooltip {
  display: none;
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  z-index: 30;
  transform: translateX(-50%);
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  background: var(--ui-text);
  color: var(--ui-bg);
  font-size: 0.75rem;
  font-weight: 500;
  pointer-events: none;
}

/*
 * Ring of the same amber as the off button (`--ui-secondary`): that token already contrasts in light and dark.
 * z-index above the button: the center is transparent and does not cover the icon.
 */
.animations-toggle.cta-halo::after {
  z-index: 1;
  background: transparent;
  border: var(--hint-ring-width) solid var(--ui-secondary);
}

/* El pulso tiene que ganar a la regla global de movimiento reducido (por defecto data-motion="reduced"). */
@media (prefers-reduced-motion: no-preference) {
  :root[data-motion] .animations-toggle[data-hint] {
    animation: animations-hint var(--hint-cycle) cubic-bezier(0.4, 0, 0.2, 1) var(--hint-delay) var(--hint-count) both !important;
  }

  :root[data-motion] .animations-toggle[data-hint]::after {
    animation: animations-hint-halo var(--hint-cycle) cubic-bezier(0.4, 0, 0.2, 1) var(--hint-delay) var(--hint-count) both !important;
  }
}

@keyframes animations-hint {
  50% {
    transform: scale(var(--hint-scale));
  }
}

@keyframes animations-hint-halo {
  50% {
    opacity: 1;
    transform: scale(var(--hint-halo-scale));
  }
}

/* Tablet and mobile (< 1024 px): 44 × 44 icon only; tooltip in hover / focus. */
@media (max-width: 1023.98px) {
  .animations-toggle {
    width: 44px;
    padding-inline: 0;
  }

  /* El texto sigue siendo el nombre accesible, pero no ocupa sitio ni se ve. */
  .animations-toggle__labels {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .animations-toggle:focus-visible:not(.animations-toggle--tooltip-off) .animations-toggle__tooltip {
    display: block;
  }
}

/* Hover only with real pointer: in touch the "pasted hover" after touching does not leave the tooltip open. */
@media (max-width: 1023.98px) and (hover: hover) {
  .animations-toggle:hover:not(.animations-toggle--tooltip-off) .animations-toggle__tooltip {
    display: block;
  }
}
</style>

<i18n lang="json">
{
  "en": {
    "enable": "Enable animations",
    "disable": "Disable animations",
    "enabled": "Animations enabled",
    "disabled": "Animations disabled"
  },
  "es": {
    "enable": "Activar animaciones",
    "disable": "Desactivar animaciones",
    "enabled": "Animaciones activadas",
    "disabled": "Animaciones desactivadas"
  }
}
</i18n>
