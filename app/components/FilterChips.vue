<script setup lang="ts">
/** Filtro de una sola opción activa (botones con `aria-pressed`). */
export interface FilterOption {
  id: string
  label: string
}

defineProps<{ options: FilterOption[]; label: string }>()
const selectedId = defineModel<string>({ required: true })
</script>

<template>
  <div role="group" :aria-label="label" class="flex flex-wrap gap-2">
    <UButton
      v-for="option in options"
      :key="option.id"
      :label="option.label"
      :icon="option.id === selectedId ? 'i-lucide-check' : undefined"
      :aria-pressed="option.id === selectedId"
      :color="option.id === selectedId ? 'primary' : 'neutral'"
      :variant="option.id === selectedId ? 'soft' : 'outline'"
      :data-testid="`filter-${option.id}`"
      @click="selectedId = option.id"
    />
  </div>
</template>
