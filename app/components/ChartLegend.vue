<script setup lang="ts">
/** Leyenda HTML enfocable: cada botón muestra u oculta su serie (`aria-pressed` = visible). */
export interface LegendItem {
  label: string
  color: string
  value?: string
  dashed?: boolean
  hidden: boolean
}

defineProps<{ items: readonly LegendItem[] }>()
const emit = defineEmits<{ toggle: [index: number] }>()
</script>

<template>
  <ul class="flex flex-wrap justify-center gap-x-1">
    <li v-for="(item, index) in items" :key="item.label">
      <button
        type="button"
        :aria-pressed="!item.hidden"
        class="inline-flex min-h-9 items-center gap-2 rounded-md px-2 text-xs transition-colors hover:bg-default focus-visible:outline-2 focus-visible:outline-primary"
        :class="item.hidden ? 'text-muted line-through' : 'text-default'"
        @click="emit('toggle', index)"
      >
        <span
          class="legend-swatch"
          :class="{ 'legend-swatch--dashed': item.dashed, 'opacity-40': item.hidden }"
          :style="{ '--swatch': item.color }"
          aria-hidden="true"
        />
        {{ item.label }}
        <span v-if="item.value" class="text-muted tabular-nums">{{ item.value }}</span>
      </button>
    </li>
  </ul>
</template>

<style scoped>
.legend-swatch {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 9999px;
  background: var(--swatch);
}

.legend-swatch--dashed {
  width: 1rem;
  height: 0;
  border-radius: 0;
  background: none;
  border-top: 2px dashed var(--swatch);
}
</style>
