<script setup lang="ts">
/** Tarjeta de una cifra clave: el valor va en el slot (número, años…) y debajo su etiqueta. */
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
