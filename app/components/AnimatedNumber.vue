<script setup lang="ts">
import { countUpValue } from '~~/lib/easing'

/**
 * Número que cuenta de 0 a `value` al entrar en pantalla (si `animate` y el usuario no pide menos movimiento).
 * El HTML generado ya trae el valor final: sin JS o con menos movimiento no cambia nada.
 */
const props = withDefaults(defineProps<{ value: number; animate?: boolean }>(), { animate: false })

const VISIBLE_THRESHOLD = 0.2

const displayedValue = ref(props.value)
const root = useTemplateRef<HTMLElement>('root')
let observer: IntersectionObserver | undefined

function countUp() {
  const startTime = performance.now()
  const step = (time: number) => {
    displayedValue.value = countUpValue(props.value, time - startTime)
    if (displayedValue.value < props.value) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

onMounted(() => {
  if (!props.animate || readDocumentMotion() === 'reduced' || !root.value) return
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
