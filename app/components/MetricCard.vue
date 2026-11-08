<script setup lang="ts">
/** Card of a key figure: the value goes in the slot (number, years...) and under its label. */
defineProps<{ label: string }>()
</script>

<template>
  <div class="rounded-xl border border-default bg-elevated p-3">
    <p class="font-display text-2xl font-bold text-primary tabular-nums">
      <slot />
    </p>
    <p class="text-xs text-muted">{{ label }}</p>
  </div>
</template>
