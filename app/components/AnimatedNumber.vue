<script setup lang="ts">
import { clamp01, countUpValue } from '~~/lib/easing'
import { useReplayable } from '~/composables/useReplayable'

/**
 * Número que cuenta de 0 a `value` al entrar en pantalla (si `animate` y las animaciones están activas).
 * El HTML generado ya trae el valor final: sin JS o con animaciones apagadas no cambia nada.
 * `format` da forma al número (miles, «1m 46s»…); si `value` cambia después, se muestra al momento.
 * `progress` (0–1): la cuenta la lleva quien lo pasa (scroll del recorrido) en lugar del temporizador.
 */
const props = withDefaults(
  defineProps<{ value: number; animate?: boolean; format?: (value: number) => string; progress?: number }>(),
  { animate: false, format: String, progress: undefined },
)

const VISIBLE_THRESHOLD = 0.2

const { isReduced } = useMotion()
const displayedValue = ref(props.value)
const isDriven = computed(() => props.progress !== undefined)
const shownValue = computed(() =>
  isDriven.value && !isReduced.value ? Math.round(props.value * clamp01(props.progress!)) : displayedValue.value,
)
const root = useTemplateRef<HTMLElement>('root')
let observer: IntersectionObserver | undefined
let frame = 0

function showFinal() {
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

function canCount() {
  return props.animate && !isDriven.value
}

useReplayable({
  element: () => root.value,
  threshold: VISIBLE_THRESHOLD,
  onEnter: 'once',
  reset() {
    if (!canCount()) return
    cancelAnimationFrame(frame)
    displayedValue.value = 0
  },
  play() {
    if (!canCount()) return
    displayedValue.value = 0
    countUp()
  },
  finish() {
    if (!canCount()) return
    showFinal()
  },
  defer() {
    if (!canCount()) return
    cancelAnimationFrame(frame)
    displayedValue.value = 0
  },
})

// Cuenta al entrar en pantalla, una vez. Si al entrar las animaciones están apagadas, se queda en el valor final.
onMounted(() => {
  if (!canCount() || !root.value) return
  if (!isReduced.value && readDocumentMotion() === 'full') displayedValue.value = 0
  observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return
      observer?.disconnect()
      if (isReduced.value) showFinal()
      else countUp()
    },
    { threshold: VISIBLE_THRESHOLD },
  )
  observer.observe(root.value)
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
    <span aria-hidden="true">{{ format(shownValue) }}</span>
    <span class="sr-only">{{ format(value) }}</span>
  </span>
</template>
