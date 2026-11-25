<script setup lang="ts">
import type { CefrLevel } from '~~/lib/profileSections'
import {
  BADGE_MS,
  CEFR_LEVELS,
  CEFR_STEP_COUNT,
  LANGUAGE_CARD_MS,
  SEGMENT_MS,
  badgeDelayMs,
  enterVars,
  filledStepCount,
  isCurrentStep,
  isFilledStep,
  languageCardDelayMs,
  languageFraction,
  segmentDelayMs,
} from '~~/lib/profileSections'

const props = defineProps<{
  id: string
  name: string
  level: CefrLevel
  index: number
}>()

const { t } = useI18n()

const filled = computed(() => filledStepCount(props.level))
const fraction = computed(() => languageFraction(props.level))
const steps = computed(() =>
  CEFR_LEVELS.map((step, stepIndex) => ({
    id: step,
    stepIndex,
    filled: isFilledStep(props.level, stepIndex),
    current: isCurrentStep(props.level, stepIndex),
  })),
)

const cardStyle = computed(() => enterVars(languageCardDelayMs(props.index), LANGUAGE_CARD_MS))
const badgeStyle = computed(() => enterVars(badgeDelayMs(props.index, filled.value), BADGE_MS))

function segmentStyle(stepIndex: number) {
  return enterVars(segmentDelayMs(props.index, stepIndex), SEGMENT_MS)
}
</script>

<template>
  <article class="language-card" :data-testid="`language-${id}`" :style="cardStyle">
    <header class="language-card__header">
      <h3 class="language-card__name">{{ name }}</h3>
      <p class="language-card__badge" :style="badgeStyle">{{ t(`profile.cefrBadge.${level}`) }}</p>
    </header>

    <div class="language-card__scale">
      <div class="language-card__summary">
        <p>{{ t('profile.scaleLabel') }}</p>
        <p class="language-card__fraction" :style="badgeStyle">{{ fraction }}</p>
      </div>
      <div
        class="language-card__track"
        role="img"
        :aria-label="t('profile.levelSummary', { level, filled, total: CEFR_STEP_COUNT })"
      >
        <div v-for="step in steps" :key="step.id" class="language-card__step">
          <span
            class="language-card__bar"
            :data-filled="step.filled ? 'true' : undefined"
            :style="step.filled ? segmentStyle(step.stepIndex) : undefined"
          />
          <span class="language-card__code" :data-current="step.current ? 'true' : undefined">{{ step.id }}</span>
        </div>
      </div>
    </div>

    <p class="language-card__use">{{ t(`profile.languageUse.${id}`) }}</p>
  </article>
</template>

<style>
.language-card {
  display: flex;
  height: 100%;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--ui-border);
  border-radius: 12px;
  background: var(--ui-bg);
}

.language-card__header,
.language-card__summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.language-card__name {
  color: var(--ui-text);
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  line-height: 24px;
}

.language-card__badge {
  flex: none;
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--brand-soft);
  color: var(--ui-primary);
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
}

.language-card__scale {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.language-card__summary {
  color: var(--ui-text-muted);
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
}

.language-card__fraction {
  color: var(--ui-text);
  font-weight: 600;
}

.language-card__track {
  display: flex;
  gap: 4px;
}

.language-card__step {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

.language-card__bar {
  width: 100%;
  height: 8px;
  box-sizing: border-box;
  border: 1px solid var(--ui-border);
  border-radius: 4px;
  background: var(--ui-bg);
}

.language-card__bar[data-filled='true'] {
  border: 0;
  background: var(--ui-primary);
  transform-origin: left center;
}

.language-card__code {
  color: var(--ui-text-muted);
  font-size: 11px;
  font-weight: 500;
  line-height: 14px;
}

.language-card__code[data-current='true'] {
  color: var(--ui-primary);
  font-weight: 700;
}

.language-card__use {
  color: var(--ui-text-muted);
  font-size: 13px;
  line-height: 19px;
}

:root[data-motion='full'] [data-reveal='hidden'] > li > .language-card {
  opacity: 0;
  transform: translateY(8px);
}

:root[data-motion='full'] [data-reveal='hidden'] .language-card__badge,
:root[data-motion='full'] [data-reveal='hidden'] .language-card__fraction {
  opacity: 0;
  transform: scale(0.6);
}

:root[data-motion='full'] [data-reveal='hidden'] .language-card__bar[data-filled='true'] {
  transform: scaleX(0);
}

:root[data-motion='full'] [data-reveal='revealed'] > li > .language-card,
:root[data-motion='full'] [data-reveal='revealed'] .language-card__badge,
:root[data-motion='full'] [data-reveal='revealed'] .language-card__fraction,
:root[data-motion='full'] [data-reveal='revealed'] .language-card__bar[data-filled='true'] {
  animation-duration: var(--enter-ms);
  animation-delay: var(--enter-delay);
  animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  animation-fill-mode: both;
  animation-iteration-count: 1;
}

:root[data-motion='full'] [data-reveal='revealed'] > li > .language-card {
  animation-name: language-card-in;
}

:root[data-motion='full'] [data-reveal='revealed'] .language-card__badge,
:root[data-motion='full'] [data-reveal='revealed'] .language-card__fraction {
  animation-name: language-badge-in;
}

:root[data-motion='full'] [data-reveal='revealed'] .language-card__bar[data-filled='true'] {
  animation-name: language-segment-in;
}

@keyframes language-card-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes language-badge-in {
  from {
    opacity: 0;
    transform: scale(0.6);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes language-segment-in {
  from {
    transform: scaleX(0);
  }

  to {
    transform: scaleX(1);
  }
}
</style>
