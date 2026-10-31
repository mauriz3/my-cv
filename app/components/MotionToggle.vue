<script setup lang="ts">
/**
 * Botón de movimiento global (cabecera de todas las páginas, junto a ES/EN y sol/luna). Activo: pausa + «Reduce motion».
 * Reducido: play + «Increase motion» en ámbar y aria-pressed=true. Con texto en escritorio (xl); en tablet y móvil,
 * solo icono de 44 × 44 (el nombre accesible es el mismo aria-label).
 */
const { t } = useI18n({ useScope: 'local' })
const { isReduced, toggle } = useMotion()

const label = computed(() => t(isReduced.value ? 'increaseMotion' : 'reduceMotion'))
const icon = computed(() => (isReduced.value ? 'i-lucide-play' : 'i-lucide-pause'))
</script>

<template>
  <button
    type="button"
    class="motion-toggle"
    :class="{ 'motion-toggle--reduced': isReduced }"
    :aria-pressed="isReduced"
    :aria-label="label"
    data-testid="motion-toggle"
    @click="toggle"
  >
    <UIcon :name="icon" class="size-4 shrink-0" aria-hidden="true" />
    <span class="hidden xl:inline">{{ label }}</span>
  </button>
</template>

<style>
/* Medidas y colores del componente «Botón movimiento» (Figma 90:9607). */
.motion-toggle {
  display: inline-flex;
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
  transition:
    background-color 150ms,
    color 150ms;
}

/* Tablet y móvil: solo icono. */
@media (max-width: 1279.98px) {
  .motion-toggle {
    width: 44px;
    padding-inline: 0;
  }
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

.motion-toggle:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
  box-shadow: 0 0 0 6px var(--brand-soft);
}
</style>

<i18n lang="json">
{
  "en": { "reduceMotion": "Reduce motion", "increaseMotion": "Increase motion" },
  "es": { "reduceMotion": "Reducir movimiento", "increaseMotion": "Aumentar movimiento" }
}
</i18n>
