<script setup lang="ts">
/**
 * Card of a Visits chart: h2, description, "View table" button and fixed height body (CLS 0).
 * The graphic (default slot) is mounted when the body enters the screen (25%): animates when viewed
 * and your code (Chart.js) is downloaded only then. Slot `table`: the accessible alternative.
 */
const props = withDefaults(
  defineProps<{ title: string; description: string; loading: boolean; size?: 'chart' | 'withLegend' | 'withList' }>(),
  { size: 'chart' },
)

/** Reserved highs (mobile / md+): graphic 200 / 240 px, plus the legend or list when there are any. */
const BODY_HEIGHT_CLASSES: Record<typeof props.size, string> = {
  chart: 'h-[200px] md:h-[240px]',
  withLegend: 'h-[296px] md:h-[320px]',
  withList: 'h-[340px] md:h-[240px]',
}

const VISIBLE_THRESHOLD = 0.25

const { t } = useI18n()
const titleId = useId()
const tableId = useId()
const isTableShown = ref(false)
const isInView = ref(false)
const body = useTemplateRef<HTMLElement>('body')
let observer: IntersectionObserver | undefined

onMounted(() => {
  if (!body.value) return
  observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return
      isInView.value = true
      observer?.disconnect()
    },
    { threshold: VISIBLE_THRESHOLD },
  )
  observer.observe(body.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <section :aria-labelledby="titleId" class="visits-card rounded-xl border border-default bg-elevated p-4 md:p-6">
    <header class="mb-4 flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h2 :id="titleId" class="text-base font-semibold text-highlighted">{{ title }}</h2>
        <p class="mt-1 text-sm text-muted">{{ description }}</p>
      </div>
      <UButton
        v-if="$slots.table"
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-table-2"
        class="min-h-11 shrink-0"
        :aria-expanded="isTableShown"
        :aria-controls="tableId"
        :disabled="loading"
        @click="isTableShown = !isTableShown"
      >
        {{ t(isTableShown ? 'visits.hideTable' : 'visits.showTable') }}
      </UButton>
    </header>

    <div ref="body" :class="BODY_HEIGHT_CLASSES[props.size]" :aria-busy="loading">
      <div v-if="loading" class="skeleton h-full rounded-lg" aria-hidden="true" />
      <slot v-else-if="isInView" />
    </div>

    <div v-show="isTableShown && !loading" :id="tableId" class="mt-4 overflow-x-auto">
      <slot v-if="isTableShown && !loading" name="table" />
    </div>
  </section>
</template>
