<script setup lang="ts">
import { MOTION_TOGGLE_ICON_TEXT_KEY, motionAnnouncementKey, motionToggleTextKey } from '~~/lib/motion'

/**
 * Botón de movimiento global (spec boton-global.md): en la cabecera de todas las páginas, entre los enlaces y ES/EN.
 * · Escritorio (≥ 1024 px): icono + texto visible, que es su nombre accesible (fijo, ver MOTION_TOGGLE_TEXT_MODE).
 * · Tablet y móvil: solo icono de 44 × 44 con nombre fijo («Reducir movimiento») y tooltip con el mismo texto.
 * aria-pressed="true" = movimiento reducido (se ve play, en ámbar). Tras pulsar, un aviso aria-live anuncia el estado.
 */
const { t } = useI18n({ useScope: 'local' })
const { motion, isReduced, toggle } = useMotion()

const text = computed(() => t(motionToggleTextKey(motion.value)))
const iconText = computed(() => t(MOTION_TOGGLE_ICON_TEXT_KEY))
const icon = computed(() => (isReduced.value ? 'i-lucide-play' : 'i-lucide-pause'))

/** Vacío hasta la primera pulsación: así no se anuncia nada al cargar. */
const announcement = ref('')
/** Escape oculta el tooltip hasta salir del botón (WCAG 1.4.13). */
const isTooltipDismissed = ref(false)

function onClick() {
  toggle()
  announcement.value = t(motionAnnouncementKey(motion.value))
}
</script>

<template>
  <span class="contents">
    <button
      type="button"
      class="motion-toggle"
      :class="{ 'motion-toggle--reduced': isReduced, 'motion-toggle--tooltip-off': isTooltipDismissed }"
      :aria-pressed="isReduced"
      data-testid="motion-toggle"
      @click="onClick"
      @keydown.esc="isTooltipDismissed = true"
      @blur="isTooltipDismissed = false"
      @mouseleave="isTooltipDismissed = false"
    >
      <UIcon :name="icon" class="size-4 shrink-0" aria-hidden="true" />
      <span class="motion-toggle__text">{{ text }}</span>
      <span class="motion-toggle__icon-name sr-only">{{ iconText }}</span>
      <span class="motion-toggle__tooltip" aria-hidden="true" data-testid="motion-tooltip">{{ iconText }}</span>
    </button>
    <span class="sr-only" aria-live="polite" data-testid="motion-announcement">{{ announcement }}</span>
  </span>
</template>

<style>
/* Medidas y colores del componente «Botón movimiento» (Figma 90:9607). */
.motion-toggle {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 44px;
  padding-inline: 1rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.5rem;
  background: var(--ui-bg-elevated);
  color: var(--ui-text);
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
  transition:
    background-color 150ms,
    color 150ms;
}

.motion-toggle:hover {
  background: var(--brand-soft);
  border-color: var(--ui-primary);
  color: var(--ui-primary);
}

/* Reducido: ámbar (accent) con texto on-brand; hover con subrayado y borde. */
.motion-toggle--reduced,
.motion-toggle--reduced:hover {
  background: var(--ui-secondary);
  border-color: var(--ui-secondary);
  color: var(--ui-text-inverted);
}

.motion-toggle--reduced:hover {
  border-color: var(--ui-text);
  text-decoration: underline;
}

/* Variante Foco: anillo brand de 2 px + halo de 4 px. */
.motion-toggle:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
  box-shadow: 0 0 0 6px var(--brand-soft);
}

.motion-toggle__tooltip {
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

/* Tablet y móvil (< 1024 px): solo icono 44 × 44; nombre fijo y tooltip en hover / foco. */
@media (max-width: 1023.98px) {
  .motion-toggle {
    width: 44px;
    padding-inline: 0;
  }

  .motion-toggle__text {
    display: none;
  }

  .motion-toggle:focus-visible:not(.motion-toggle--tooltip-off) .motion-toggle__tooltip {
    display: block;
  }
}

/* Hover solo con puntero real: en táctil el «hover pegado» tras tocar no deja el tooltip abierto. */
@media (max-width: 1023.98px) and (hover: hover) {
  .motion-toggle:hover:not(.motion-toggle--tooltip-off) .motion-toggle__tooltip {
    display: block;
  }
}

/* Escritorio: el texto visible es el nombre. */
@media (min-width: 1024px) {
  .motion-toggle__icon-name {
    display: none;
  }
}
</style>

<i18n lang="json">
{
  "en": {
    "reduceMotion": "Reduce motion",
    "increaseMotion": "Increase motion",
    "motionReduced": "Motion reduced",
    "motionOn": "Motion on"
  },
  "es": {
    "reduceMotion": "Reducir movimiento",
    "increaseMotion": "Aumentar movimiento",
    "motionReduced": "Movimiento reducido",
    "motionOn": "Movimiento activado"
  }
}
</i18n>
