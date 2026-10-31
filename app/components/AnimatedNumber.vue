<script setup lang="ts">
import { countUpValue } from '~~/lib/easing'

/**
 * Número que cuenta de 0 a `value` al entrar en pantalla (si `animate` y el movimiento está activo en ese momento).
 * El HTML generado ya trae el valor final: sin JS o con menos movimiento no cambia nada.
 * `format` da forma al número (miles, «1m 46s»…); si `value` cambia después, se muestra al momento.
 */
const props = withDefaults(defineProps<{ value: number; animate?: boolean; format?: (value: number) => string }>(), {
  animate: false,
  format: String,
})

const VISIBLE_THRESHOLD = 0.2

const { isReduced } = useMotion()
const displayedValue = ref(props.value)
const root = useTemplateRef<HTMLElement>('root')
let observer: IntersectionObserver | undefined
let frame = 0
let hasEntered = false

function finish() {
  cancelAnimationFrame(frame)
  displayedValue.value = props.value
}

function countUp() {
  const startTime = performance.now()
  const step = (time: number) => {
    displayedValue.value = countUpValue(props.value, time - startTime)
    if (displayedValue.value < props.value) frame = requestAnimationFrame(step)
  }
  frame = requestAnimationFrame(step)
}

// Cuenta al entrar en pantalla, una vez. Si al entrar el movimiento está reducido, se queda en el valor final.
onMounted(() => {
  if (!props.animate || !root.value) return
  if (readDocumentMotion() === 'full') displayedValue.value = 0
  observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return
      observer?.disconnect()
      hasEntered = true
      if (isReduced.value) finish()
      else countUp()
    },
    { threshold: VISIBLE_THRESHOLD },
  )
  observer.observe(root.value)
})

// Pausa a mitad: salta al valor final. Reanudar antes de entrar en pantalla: contará al entrar.
watch(isReduced, (reduced) => {
  if (reduced) finish()
  else if (props.animate && !hasEntered) displayedValue.value = 0
})

watch(
  () => props.value,
  (value) => {
    displayedValue.value = value
  },
)

onBeforeUnmount(() => {
  observer?.disconnect()
  cancelAnimationFrame(frame)
})
</script>

<template>
  <span ref="root">
    <span aria-hidden="true">{{ format(displayedValue) }}</span>
    <span class="sr-only">{{ format(value) }}</span>
  </span>
</template>
