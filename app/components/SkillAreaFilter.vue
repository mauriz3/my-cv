<script lang="ts">
/** Valor del filtro que muestra todas las áreas. */
import { ALL_FILTER_ID } from '~/utils/filters'

export const ALL_SKILL_AREAS = ALL_FILTER_ID
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
  { id: ALL_SKILL_AREAS, label: t('all') },
  ...cv.value.skillAreas.map((area) => ({ id: area.id, label: area.name })),
])
</script>

<template>
  <FilterChips v-model="selectedArea" :options="options" :label="t('label')" />
</template>

<i18n lang="json">
{
  "en": { "all": "All", "label": "Filter skills by area" },
  "es": { "all": "Todo", "label": "Filtrar habilidades por área" }
}
</i18n>
