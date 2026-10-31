<script setup lang="ts" generic="Value extends string">
/**
 * Control segmentado de una sola elección (radiogroup): clic, o flechas / Inicio / Fin con el foco dentro.
 * La píldora del seleccionado se desliza (200 ms; sin transición con movimiento reducido).
 */
const props = defineProps<{ options: readonly { value: Value; label: string }[]; label: string }>()
const model = defineModel<Value>({ required: true })

const KEY_STEPS: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }

const buttons = useTemplateRef<HTMLButtonElement[]>('buttons')
const selectedIndex = computed(() => props.options.findIndex((option) => option.value === model.value))

function select(index: number, moveFocus = false) {
  const option = props.options[index]
  if (!option) return
  model.value = option.value
  if (moveFocus) buttons.value?.[index]?.focus()
}

function onKeydown(event: KeyboardEvent) {
  const count = props.options.length
  let next: number | undefined
  if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = count - 1
  else if (event.key in KEY_STEPS) next = (selectedIndex.value + (KEY_STEPS[event.key] ?? 0) + count) % count
  if (next === undefined) return
  event.preventDefault()
  select(next, true)
}
</script>

<template>
  <div
    role="radiogroup"
    :aria-label="label"
    class="segmented relative grid rounded-lg border border-default bg-elevated p-1"
    :style="{ '--segment-count': options.length, '--segment-index': Math.max(selectedIndex, 0) }"
    @keydown="onKeydown"
  >
    <span class="segmented__pill" aria-hidden="true" />
    <button
      v-for="(option, index) in options"
      ref="buttons"
      :key="option.value"
      type="button"
      role="radio"
      :aria-checked="index === selectedIndex"
      :tabindex="index === selectedIndex ? 0 : -1"
      :data-testid="`segment-${option.value}`"
      class="relative min-h-11 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      :class="index === selectedIndex ? 'text-inverted' : 'text-muted hover:text-default'"
      @click="select(index)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.segmented {
  grid-template-columns: repeat(var(--segment-count), minmax(0, 1fr));
}

.segmented__pill {
  position: absolute;
  inset-block: 0.25rem;
  inset-inline-start: 0.25rem;
  width: calc((100% - 0.5rem) / var(--segment-count));
  border-radius: 0.375rem;
  background: var(--ui-primary);
  transform: translateX(calc(var(--segment-index) * 100%));
  transition: transform 200ms cubic-bezier(0.2, 0, 0, 1);
}
</style>
