<script setup lang="ts">
import { coverStatusOf, type CoverStatus } from '~~/lib/books'
import type { Book } from '~~/data/schema'

/**
 * Book cover: Fixed size frame (2:3, no mockup jumps), skeleton while loading
 * and, if the image fails, title and author about brand-soft.
 */
const props = defineProps<{ book: Book }>()

const image = ref<HTMLImageElement | null>(null)
const status = ref<CoverStatus>('loading')

// If the image ended (or failed) before hydrating, Vue does not receive the event: it reads from its own<img>.
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
      <!-- Visual substitute: the title and author are already read right after, on the card. -->
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
