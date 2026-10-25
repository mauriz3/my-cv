<script lang="ts">
/** Valor del filtro que muestra todas las áreas. */
export const ALL_SKILL_AREAS = 'all'
</script>

<script setup lang="ts">
/**
 * Filtro de Habilidades: All · Front End · Back End · DevOps (las áreas salen de los datos).
 * `v-model` = `ALL_SKILL_AREAS` o el `id` del área elegida.
 */
const selectedArea = defineModel<string>({ default: ALL_SKILL_AREAS })

const { t } = useI18n({ useScope: 'local' })
const cv = useCv()

const options = computed(() => [
  { id: ALL_SKILL_AREAS, name: t('all') },
  ...cv.value.skillAreas.map((area) => ({ id: area.id, name: area.name })),
])
</script>

<template>
  <div role="group" :aria-label="t('label')" class="flex flex-wrap gap-2">
    <UButton
      v-for="option in options"
      :key="option.id"
      :label="option.name"
      :icon="option.id === selectedArea ? 'i-lucide-check' : undefined"
      :aria-pressed="option.id === selectedArea"
      :color="option.id === selectedArea ? 'primary' : 'neutral'"
      :variant="option.id === selectedArea ? 'soft' : 'outline'"
      class="min-h-11"
      @click="selectedArea = option.id"
    />
  </div>
</template>

<i18n lang="json">
{
  "en": { "all": "All", "label": "Filter skills by area" },
  "es": { "all": "Todo", "label": "Filtrar habilidades por área" }
}
</i18n>
