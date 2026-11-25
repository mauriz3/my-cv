<script setup lang="ts">
import {
  BODY_DELAY_MS,
  BODY_MS,
  PROFILE_REVEAL_THRESHOLD,
  QUOTE_BAR_MS,
  QUOTE_TEXT_DELAY_MS,
  QUOTE_TEXT_MS,
  enterVars,
} from '~~/lib/profileSections'

/**
 * Profile “About” card: full-width MVP quote, bio, and the decorative equation.
 * The equation is hidden below 768px. Entrance uses the shared opt-in reveal.
 */
const { t } = useI18n()

const root = ref<HTMLElement | null>(null)
const { state: revealState } = useRevealOnce(root, PROFILE_REVEAL_THRESHOLD)

const barStyle = enterVars(0, QUOTE_BAR_MS)
const quoteStyle = enterVars(QUOTE_TEXT_DELAY_MS, QUOTE_TEXT_MS)
const bodyStyle = enterVars(BODY_DELAY_MS, BODY_MS)
</script>

<template>
  <section
    ref="root"
    class="about flex flex-col gap-5 rounded-[14px] border border-default bg-elevated p-7"
    aria-labelledby="about-title"
    data-testid="about-section"
    :data-reveal="revealState"
  >
    <h2 id="about-title" class="font-display text-[22px] leading-7 font-bold text-highlighted">
      {{ t('profile.summary') }}
    </h2>

    <blockquote class="about__quote">
      <span class="about__quote-bar" aria-hidden="true" :style="barStyle" />
      <p class="about__quote-text" :style="quoteStyle">{{ t('profile.aboutQuote') }}</p>
    </blockquote>

    <div class="about__row">
      <p class="about__body" :style="bodyStyle">{{ t('profile.aboutBody') }}</p>
      <MvpEquation />
    </div>
  </section>
</template>

<style>
.about__quote {
  display: flex;
  gap: 12px;
  align-items: stretch;
  width: 100%;
  padding: 16px;
  border-radius: 8px;
  background: var(--brand-soft);
}

.about__quote-bar {
  flex: none;
  width: 3px;
  border-radius: 2px;
  background: var(--ui-primary);
  transform-origin: bottom center;
}

.about__quote-text {
  flex: 1;
  min-width: 0;
  color: var(--ui-text);
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 500;
  line-height: 26px;
  transform-origin: center;
}

.about__row {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.about__body {
  max-width: 68ch;
  color: var(--ui-text);
  font-size: 15px;
  line-height: 24px;
}

@media (min-width: 1280px) {
  .about__row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 412px;
    gap: 24px;
    align-items: center;
  }
}

:root[data-motion='full'] [data-reveal='hidden'] .about__quote-bar {
  opacity: 0;
  transform: scaleY(0);
}

:root[data-motion='full'] [data-reveal='hidden'] .about__quote-text {
  opacity: 0;
  transform: translateY(22px);
}

:root[data-motion='full'] [data-reveal='hidden'] .about__body {
  opacity: 0;
  transform: translateY(28px);
}

:root[data-motion='full'] [data-reveal='revealed'] .about__quote-bar,
:root[data-motion='full'] [data-reveal='revealed'] .about__quote-text,
:root[data-motion='full'] [data-reveal='revealed'] .about__body {
  animation-duration: var(--enter-ms);
  animation-delay: var(--enter-delay);
  animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  animation-fill-mode: both;
  animation-iteration-count: 1;
}

:root[data-motion='full'] [data-reveal='revealed'] .about__quote-bar {
  animation-name: about-bar-in;
}

:root[data-motion='full'] [data-reveal='revealed'] .about__quote-text {
  animation-name: about-quote-in;
}

:root[data-motion='full'] [data-reveal='revealed'] .about__body {
  animation-name: about-body-in;
}

@keyframes about-bar-in {
  from {
    opacity: 0;
    transform: scaleY(0);
  }

  to {
    opacity: 1;
    transform: scaleY(1);
  }
}

@keyframes about-quote-in {
  from {
    opacity: 0;
    transform: translateY(22px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes about-body-in {
  from {
    opacity: 0;
    transform: translateY(28px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
