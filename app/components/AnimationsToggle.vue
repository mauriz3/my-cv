<script setup lang="ts">
import {
  PULSE_CYCLE_MS,
  PULSE_DELAY_MS,
  PULSE_ITERATIONS,
  PULSE_SCALE,
  ANIMATIONS_HINT_KEY,
  shouldPulse,
} from '~~/lib/animations'
import { registerPulseStop, useAnimations } from '~/composables/useAnimations'

/**
 * Botón global de animaciones, en la cabecera de todas las páginas, entre los enlaces y ES/EN.
 * OFF (estático): ámbar y play, «Activar animaciones». ON: neutro y pausa, «Desactivar animaciones».
 * Sin aria-pressed: el nombre accesible es el copy de la acción. Escritorio muestra el texto;
 * por debajo de 1024 px solo el icono de 44×44 y un tooltip con el mismo texto.
 * Las dos etiquetas están en el DOM y el CSS enseña la que corresponde a data-motion, sin parpadeo.
 */
const { t } = useI18n({ useScope: 'local' })
const { motion, stored, prefersReducedMotion, toggle } = useAnimations()

/** Vacío hasta montar: el primer render coincide con el HTML del servidor (el copy visible lo decide el CSS). */
const label = ref('')
const labelReady = ref(false)
/** Vacío hasta la primera pulsación: así no se anuncia nada al cargar. */
const announcement = ref('')
/** Escape oculta el tooltip hasta salir del botón (WCAG 1.4.13). */
const isTooltipDismissed = ref(false)
const hint = ref(false)

const hintStyle = {
  '--hint-cycle': `${PULSE_CYCLE_MS}ms`,
  '--hint-delay': `${PULSE_DELAY_MS}ms`,
  '--hint-count': String(PULSE_ITERATIONS),
  '--hint-scale': String(PULSE_SCALE),
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

watch(motion, () => {
  if (labelReady.value) syncLabel()
})

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

onMounted(() => {
  labelReady.value = true
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
  const options = { capture: true, passive: true, signal: hintController.signal } as const
  for (const type of ['pointerdown', 'keydown', 'wheel', 'touchmove'] as const) {
    document.addEventListener(type, stopHint, options)
  }
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) stopHint()
    },
    { signal: hintController.signal },
  )
})

onBeforeUnmount(stopHint)
</script>

<template>
  <span class="contents">
    <button
      type="button"
      class="animations-toggle"
      :class="{ 'animations-toggle--tooltip-off': isTooltipDismissed }"
      :style="hintStyle"
      :data-hint="hint ? '' : undefined"
      :aria-label="label || undefined"
      data-testid="animations-toggle"
      @click="onClick"
      @pointerenter="stopHint"
      @focus="stopHint"
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
/* Medidas del botón de animaciones (Figma 140:7553). El color lo decide data-motion, no una clase de Vue. */
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
  transition:
    background-color 150ms,
    color 150ms,
    border-color 150ms;
}

.animations-toggle__icon {
  width: 1rem;
  height: 1rem;
}

/* Las dos copias ocupan el mismo sitio: el botón reserva el ancho de la más larga. */
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

/* OFF: ámbar. El borde de 2 px ya está reservado; en reposo es del mismo color que el relleno. */
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

/* El pulso tiene que ganar a la regla global de movimiento reducido (por defecto data-motion="reduced"). */
@media (prefers-reduced-motion: no-preference) {
  :root[data-motion] .animations-toggle[data-hint] {
    animation: animations-hint var(--hint-cycle) ease-in-out var(--hint-delay) var(--hint-count) both !important;
  }
}

@keyframes animations-hint {
  50% {
    transform: scale(var(--hint-scale));
  }
}

/* Tablet y móvil (< 1024 px): solo icono 44 × 44; tooltip en hover / foco. */
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

/* Hover solo con puntero real: en táctil el «hover pegado» tras tocar no deja el tooltip abierto. */
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
