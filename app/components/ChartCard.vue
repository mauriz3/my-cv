<script setup lang="ts">
/**
 * Tarjeta de una gráfica de Visitas: h2, descripción, botón «Ver tabla» y cuerpo de alto fijo (CLS 0).
 * La gráfica (slot por defecto) se monta cuando el cuerpo entra en pantalla (25 %): anima al verse
 * y su código (Chart.js) se descarga solo entonces. Slot `table`: la alternativa accesible.
 */
const props = withDefaults(
  defineProps<{ title: string; description: string; loading: boolean; size?: 'chart' | 'withLegend' | 'withList' }>(),
  { size: 'chart' },
)

/** Altos reservados (móvil / md+): gráfica 200 / 240 px, más la leyenda o la lista cuando las hay. */
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
      <div v-if="loading" class="visits-skeleton h-full rounded-lg" aria-hidden="true" />
      <slot v-else-if="isInView" />
    </div>

    <div v-show="isTableShown && !loading" :id="tableId" class="mt-4 overflow-x-auto">
      <slot v-if="isTableShown && !loading" name="table" />
    </div>
  </section>
</template>
