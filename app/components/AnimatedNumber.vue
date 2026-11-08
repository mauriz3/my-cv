<script setup lang="ts">
import { clamp01, countUpValue } from '~~/lib/easing'
import { useReplayable } from '~/composables/useReplayable'

/**
 * Number that counts from 0 to `value` when entering the screen (if `animate` and the animations are active).
 * The generated HTML already brings the final value: without JS or with animations turned off nothing changes.
 * `format` shapes the number (thousands, "1m 46s"...); if `value` changes later, it is displayed instantly.
 * `progress` (0–1): the count is taken by the one who passes it (scroll of the tour) instead of the timer.
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

// Counts when entering the screen, once. If the animations are off when entering, it remains at the final value.
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
