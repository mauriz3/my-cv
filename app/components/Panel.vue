<script setup lang="ts">
/** Dashboard container: title, optional grey note on the right and content. */
defineProps<{ title: string; note?: string; fill?: boolean }>()

const titleId = useId()
</script>

<template>
  <section
    :aria-labelledby="titleId"
    class="rounded-xl border border-default bg-elevated p-4 md:p-6"
    :class="fill ? 'flex h-full flex-col' : undefined"
  >
    <header class="mb-4 flex flex-wrap items-baseline justify-between gap-2">
      <h2 :id="titleId" class="text-base font-semibold text-highlighted">{{ title }}</h2>
      <p v-if="note" class="text-xs text-muted">{{ note }}</p>
    </header>
    <div :class="fill ? 'flex min-h-0 flex-1 flex-col' : undefined">
      <slot />
    </div>
  </section>
</template>
