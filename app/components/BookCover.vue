<script setup lang="ts">
import { coverStatusOf, type CoverStatus } from '~~/lib/books'
import type { Book } from '~~/data/schema'

/**
 * Portada de un libro: marco de tamaño fijo (2:3, sin saltos de maqueta), esqueleto mientras carga
 * y, si la imagen falla, título y autor sobre brand-soft.
 */
const props = defineProps<{ book: Book }>()

const image = ref<HTMLImageElement | null>(null)
const status = ref<CoverStatus>('loading')

// Si la imagen terminó (o falló) antes de hidratar, Vue no recibe el evento: se lee del propio <img>.
onMounted(() => {
  if (image.value) status.value = coverStatusOf(image.value)
})
</script>

<template>
  <div class="book-cover" :data-status="status">
    <div class="book-cover__face" :class="{ skeleton: status === 'loading' }">
      <img
        v-if="status !== 'error'"
        ref="image"
        :src="props.book.cover.src"
        :alt="props.book.coverAlt"
        :width="props.book.cover.width"
        :height="props.book.cover.height"
        loading="lazy"
        decoding="async"
        class="size-full object-cover"
        @load="status = 'loaded'"
        @error="status = 'error'"
      />
      <!-- Sustituto visual: el título y el autor ya se leen justo después, en la tarjeta. -->
      <div
        v-else
        class="flex size-full flex-col items-center justify-center gap-1 bg-(--brand-soft) p-2 text-center"
        aria-hidden="true"
        data-testid="book-cover-fallback"
      >
        <span class="font-display text-xs font-bold text-primary">{{ props.book.title }}</span>
        <span class="text-[0.625rem] text-muted">{{ props.book.author }}</span>
      </div>
    </div>
  </div>
</template>
