<script lang="ts">
import { REDUCE_MOTION_CLASS, REDUCE_MOTION_STORAGE_KEY, STORED_OFF, STORED_ON } from '~~/lib/motion'

const SYSTEM_REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function readStoredPreference(): boolean {
  return localStorage.getItem(REDUCE_MOTION_STORAGE_KEY) === STORED_ON
}

/** ¿Hay que evitar animaciones? Sí si lo pide el sistema o el botón «Reduce motion». Solo en cliente. */
export function isMotionReduced(): boolean {
  return readStoredPreference() || window.matchMedia(SYSTEM_REDUCED_MOTION_QUERY).matches
}
</script>

<script setup lang="ts">
/**
 * Botón «Reduce motion» (aria-pressed). Guarda la preferencia en localStorage
 * y pone `.reduce-motion` en `<html>` para que el CSS muestre el estado final estático.
 */
const { t } = useI18n({ useScope: 'local' })
const isReduced = ref(false)

function applyPreference(reduced: boolean) {
  isReduced.value = reduced
  document.documentElement.classList.toggle(REDUCE_MOTION_CLASS, reduced)
}

function toggle() {
  const reduced = !isReduced.value
  localStorage.setItem(REDUCE_MOTION_STORAGE_KEY, reduced ? STORED_ON : STORED_OFF)
  applyPreference(reduced)
}

onMounted(() => applyPreference(readStoredPreference()))
</script>

<template>
  <UButton
    :aria-pressed="isReduced"
    :label="t('reduceMotion')"
    icon="i-lucide-pause"
    color="neutral"
    variant="outline"
    class="min-h-11"
    @click="toggle"
  />
</template>

<i18n lang="json">
{
  "en": { "reduceMotion": "Reduce motion" },
  "es": { "reduceMotion": "Reducir movimiento" }
}
</i18n>
