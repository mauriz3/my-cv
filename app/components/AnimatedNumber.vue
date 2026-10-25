<script setup lang="ts">
import { isMotionReduced } from './ReduceMotionToggle.vue'

/**
 * Número que cuenta de 0 a `value` al entrar en pantalla (si `animate` y el usuario no pide menos movimiento).
 * El HTML generado ya trae el valor final: sin JS o con menos movimiento no cambia nada.
 */
const props = withDefaults(defineProps<{ value: number; animate?: boolean }>(), { animate: false })

const COUNT_UP_DURATION_MS = 900
const VISIBLE_THRESHOLD = 0.2
const EASE_OUT_POWER = 3

const displayedValue = ref(props.value)
const root = useTemplateRef<HTMLElement>('root')
let observer: IntersectionObserver | undefined

function easeOut(progress: number): number {
  return 1 - Math.pow(1 - progress, EASE_OUT_POWER)
}

function countUp() {
  const startTime = performance.now()
  const step = (time: number) => {
    const progress = Math.min(1, (time - startTime) / COUNT_UP_DURATION_MS)
    displayedValue.value = Math.round(props.value * easeOut(progress))
    if (progress < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

onMounted(() => {
  if (!props.animate || isMotionReduced() || !root.value) return
  displayedValue.value = 0
  observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return
      observer?.disconnect()
      countUp()
    },
    { threshold: VISIBLE_THRESHOLD },
  )
  observer.observe(root.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <span ref="root">
    <span aria-hidden="true">{{ displayedValue }}</span>
    <span class="sr-only">{{ value }}</span>
  </span>
</template>
