<script setup lang="ts">
import {
  RESULT_MS,
  ROCKET_DELAY_MS,
  ROCKET_MS,
  SIGN_MS,
  TERM_MS,
  enterVars,
  resultBarDelayMs,
  signDelayMs,
  termDelayMs,
} from '~~/lib/profileSections'

/**
 * Decorative “creative thinking + UX + prototyping = MVP” equation.
 * Paths come from the approved Figma graphic. Paint uses theme tokens so light and dark match.
 * Hidden from assistive tech: the quote next to it already says the same thing.
 */
const TERM_COUNT = 3
const SIGN_COUNT = 3

/** Dashboard bars inside the MVP window, shortest to tallest. */
const BAR_PATHS = [
  'M12 28.5H9.5C8.94772 28.5 8.5 28.9477 8.5 29.5V33C8.5 33.5523 8.94772 34 9.5 34H12C12.5523 34 13 33.5523 13 33V29.5C13 28.9477 12.5523 28.5 12 28.5Z',
  'M19.2 24.5H16.7C16.1477 24.5 15.7 24.9477 15.7 25.5V33C15.7 33.5523 16.1477 34 16.7 34H19.2C19.7523 34 20.2 33.5523 20.2 33V25.5C20.2 24.9477 19.7523 24.5 19.2 24.5Z',
  'M26.5 21H24C23.4477 21 23 21.4477 23 22V33C23 33.5523 23.4477 34 24 34H26.5C27.0523 34 27.5 33.5523 27.5 33V22C27.5 21.4477 27.0523 21 26.5 21Z',
] as const

const termStyle = (index: number) => enterVars(termDelayMs(index), TERM_MS)
const signStyle = (index: number) => enterVars(signDelayMs(index), SIGN_MS)
const barStyle = (index: number) => enterVars(resultBarDelayMs(index), RESULT_MS)
const rocketStyle = enterVars(ROCKET_DELAY_MS, ROCKET_MS)
</script>

<template>
  <div class="mvp" data-testid="mvp-equation" aria-hidden="true">
    <div v-for="index in TERM_COUNT" :key="`term-${index - 1}`" class="mvp__slot">
      <div
        class="mvp__term"
        :class="{
          'mvp__term--ux': index === 2,
          'mvp__term--wire': index === 3,
        }"
        :style="termStyle(index - 1)"
      >
        <svg v-if="index === 1" class="mvp__icon" width="36" height="36" viewBox="0 0 36 36" fill="none">
          <path
            d="M18 3.5V5.7M8.2 7.6L9.8 9.2M27.8 7.6L26.2 9.2M4.8 16.5H7M29 16.5H31.2"
            stroke="var(--ui-primary)"
            stroke-width="1.8"
            stroke-linecap="round"
          />
          <path
            d="M13.6 24.8V23.9C13.6 22.5 12.8 21.3 11.8 20.3C10.9937 19.1627 10.5158 17.8255 10.4185 16.4348C10.3213 15.0441 10.6084 13.6534 11.2485 12.415C11.8886 11.1765 12.8571 10.1379 14.0478 9.41298C15.2386 8.68801 16.6059 8.30455 18 8.30455C19.3941 8.30455 20.7614 8.68801 21.9522 9.41298C23.1429 10.1379 24.1114 11.1765 24.7515 12.415C25.3916 13.6534 25.6787 15.0441 25.5815 16.4348C25.4842 17.8255 25.0063 19.1627 24.2 20.3C23.2 21.3 22.4 22.5 22.4 23.9V24.8"
            fill="var(--brand-soft)"
            stroke="var(--ui-primary)"
            stroke-width="1.85"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M15.2 19.8L16.6 17L18 19.2L19.4 17L20.8 19.8"
            stroke="var(--ui-primary)"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M14.2 25.2H21.8M14.6 27.9H21.4M15.8 30.6H20.2"
            stroke="var(--ui-text-muted)"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>

        <template v-else-if="index === 2">
          <svg class="mvp__window" width="44" height="38" viewBox="0 0 44 38" fill="none">
            <path
              d="M30 4H6C3.79086 4 2 5.79086 2 8V24C2 26.2091 3.79086 28 6 28H30C32.2091 28 34 26.2091 34 24V8C34 5.79086 32.2091 4 30 4Z"
              fill="var(--ui-bg-elevated)"
              stroke="var(--ui-primary)"
              stroke-width="1.8"
            />
            <path d="M2 10.5H34" stroke="var(--ui-border)" stroke-width="1.5" />
            <path
              d="M6.2 8.4C6.80751 8.4 7.3 7.90751 7.3 7.3C7.3 6.69249 6.80751 6.2 6.2 6.2C5.59249 6.2 5.1 6.69249 5.1 7.3C5.1 7.90751 5.59249 8.4 6.2 8.4Z"
              fill="var(--ui-primary)"
            />
            <path
              d="M9.8 8.4C10.4075 8.4 10.9 7.90751 10.9 7.3C10.9 6.69249 10.4075 6.2 9.8 6.2C9.19249 6.2 8.7 6.69249 8.7 7.3C8.7 7.90751 9.19249 8.4 9.8 8.4Z"
              fill="var(--ui-text-muted)"
            />
          </svg>
          <span class="mvp__ux-label">UX</span>
          <svg class="mvp__cursor" width="15" height="16" viewBox="0 0 15 16" fill="none">
            <path
              d="M2 2L13 6.6L8.4 8.2L6.8 12.8L2 2Z"
              fill="var(--ui-bg-elevated)"
              stroke="var(--ui-primary)"
              stroke-width="1.8"
              stroke-linejoin="round"
            />
          </svg>
        </template>

        <svg v-else class="mvp__icon" width="36" height="36" viewBox="0 0 36 36" fill="none">
          <path
            d="M6.3579 6.35152C6.8589 6.12568 7.41477 6 8 6H9.79487M4.35152 8.3579C4.12568 8.8589 4 9.41478 4 10V12.1538M4 15.8462V20.1538M4 23.8462V26C4 26.5852 4.12568 27.1411 4.35152 27.6421M6.3579 29.6485C6.8589 29.8743 7.41478 30 8 30H9.79487M12.8718 30H16.4615M19.5385 30H23.1282M26.2051 30H28C28.5852 30 29.1411 29.8743 29.6421 29.6485M31.6485 27.6421C31.8743 27.1411 32 26.5852 32 26V23.8462M32 20.1538V15.8462M32 12.1538V10C32 9.41477 31.8743 8.8589 31.6485 8.3579M29.6421 6.35152C29.1411 6.12568 28.5852 6 28 6H26.2051M23.1282 6H19.5385M16.4615 6H12.8718"
            stroke="var(--ui-primary)"
            stroke-width="1.8"
            stroke-linecap="round"
          />
          <path
            d="M5 13H6.41818M31 13H29.5818M8.78182 13H11.6182M13.9818 13H16.8182M19.1818 13H22.0182M24.3818 13H27.2182"
            stroke="var(--ui-text-muted)"
            stroke-width="1.6"
            stroke-linecap="round"
          />
          <path
            d="M10 17H15.5C16.3284 17 17 17.6716 17 18.5V23.5C17 24.3284 16.3284 25 15.5 25H10C9.17157 25 8.5 24.3284 8.5 23.5V18.5C8.5 17.6716 9.17157 17 10 17Z"
            stroke="var(--ui-primary)"
            stroke-width="1.6"
          />
          <path
            d="M20.5 18.5H27M20.5 23H25"
            stroke="var(--ui-text-muted)"
            stroke-width="1.7"
            stroke-linecap="round"
          />
        </svg>
      </div>
      <span
        class="mvp__sign"
        :class="{ 'mvp__sign--equals': index === SIGN_COUNT }"
        :style="signStyle(index - 1)"
      >{{ index === SIGN_COUNT ? '=' : '+' }}</span>
    </div>

    <div class="mvp__result" :style="barStyle(0)">
      <svg class="mvp__mvp" width="46" height="44" viewBox="0 0 46 44" fill="none">
        <path
          d="M28.5 11H7.5C5.01472 11 3 13.0147 3 15.5V33.5C3 35.9853 5.01472 38 7.5 38H28.5C30.9853 38 33 35.9853 33 33.5V15.5C33 13.0147 30.9853 11 28.5 11Z"
          fill="var(--ui-bg-elevated)"
          stroke="var(--ui-primary)"
          stroke-width="1.85"
        />
        <path d="M3 18H33" stroke="var(--ui-border)" stroke-width="1.5" />
        <path
          d="M7.5 15.7C8.16274 15.7 8.7 15.1627 8.7 14.5C8.7 13.8373 8.16274 13.3 7.5 13.3C6.83726 13.3 6.3 13.8373 6.3 14.5C6.3 15.1627 6.83726 15.7 7.5 15.7Z"
          fill="var(--ui-primary)"
        />
        <path
          d="M11.5 15.7C12.1627 15.7 12.7 15.1627 12.7 14.5C12.7 13.8373 12.1627 13.3 11.5 13.3C10.8373 13.3 10.3 13.8373 10.3 14.5C10.3 15.1627 10.8373 15.7 11.5 15.7Z"
          fill="var(--ui-text-muted)"
        />
        <path
          v-for="(path, index) in BAR_PATHS"
          :key="path"
          class="mvp__bar"
          :style="barStyle(index)"
          :d="path"
          fill="var(--ui-primary)"
        />
        <g class="mvp__rocket" :style="rocketStyle">
          <path
            d="M41.8 4.2C37.2 4.6 33.4 6.4 30.6 9.2L27.8 12L32.4 16.6L35.2 13.8C38 11 39.8 7.2 40.2 2.6C40.3 2 41.1 1.8 41.8 3.2V4.2Z"
            fill="var(--brand-soft)"
            stroke="var(--accent)"
            stroke-width="1.85"
            stroke-linejoin="round"
          />
          <path
            d="M28.8 11L24.6 11.7L23 14.7L26.4 15.7M33.6 15.8L32.9 20L29.9 21.6L28.9 18.2"
            stroke="var(--accent)"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M36.2 11.4C37.0837 11.4 37.8 10.6837 37.8 9.8C37.8 8.91634 37.0837 8.2 36.2 8.2C35.3163 8.2 34.6 8.91634 34.6 9.8C34.6 10.6837 35.3163 11.4 36.2 11.4Z"
            fill="var(--accent)"
          />
          <path
            d="M24.8 18.6L22 21.4"
            stroke="var(--accent)"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </g>
      </svg>
    </div>
  </div>
</template>

<style>
.mvp {
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-rocket: cubic-bezier(0.16, 1, 0.3, 1);
  --mvp-shadow: 0 1px 3px rgb(31 35 40 / 0.06);
  display: none;
  pointer-events: none;
  user-select: none;
}

.mvp__slot {
  display: contents;
}

.mvp__term,
.mvp__result {
  position: relative;
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 14px;
}

.mvp__term {
  border: 1px solid var(--ui-border);
  background: var(--ui-bg-elevated);
  box-shadow: var(--mvp-shadow);
}

.mvp__term--wire {
  border: 1.25px dashed var(--ui-primary);
}

.mvp__result {
  border: 1.5px solid var(--ui-primary);
  background: var(--brand-soft);
  box-shadow: none;
}

.mvp__sign {
  flex: none;
  color: var(--ui-text-muted);
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  line-height: 1;
  text-align: center;
}

.mvp__sign--equals {
  color: var(--ui-primary);
}

.mvp__window,
.mvp__cursor,
.mvp__ux-label {
  position: absolute;
}

.mvp__ux-label {
  color: var(--ui-text);
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 700;
  line-height: 14px;
}

.mvp__bar,
.mvp__rocket {
  transform-box: fill-box;
}

.mvp__bar {
  transform-origin: bottom center;
}

@media (min-width: 768px) {
  .mvp {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 104px;
    gap: 14px;
    padding: 18px 20px;
    border: 1px solid var(--ui-border);
    border-radius: 12px;
    background: var(--ui-bg);
  }

  .mvp__term {
    width: 58px;
    height: 58px;
  }

  .mvp__result {
    width: 66px;
    height: 64px;
  }

  .mvp__window {
    top: 9px;
    left: 6px;
  }

  .mvp__ux-label {
    top: 21px;
    left: 13px;
  }

  .mvp__cursor {
    top: 29px;
    left: 33px;
  }
}

@media (min-width: 1280px) {
  .mvp {
    width: 412px;
    height: 116px;
    gap: 8px;
    padding: 20px 18px;
  }

  .mvp__term {
    width: 62px;
    height: 64px;
  }

  .mvp__result {
    width: 70px;
    height: 68px;
  }

  .mvp__window {
    top: 12px;
    left: 8px;
  }

  .mvp__ux-label {
    top: 24px;
    left: 15px;
  }

  .mvp__cursor {
    top: 32px;
    left: 35px;
  }
}

:root[data-motion='full'] [data-reveal='hidden'] .mvp__term {
  opacity: 0;
  transform: translateY(20px) scale(0.86);
}

:root[data-motion='full'] [data-reveal='hidden'] .mvp__sign {
  opacity: 0;
  transform: scale(0.3);
}

:root[data-motion='full'] [data-reveal='hidden'] .mvp__result {
  opacity: 0;
  transform: scale(0);
}

:root[data-motion='full'] [data-reveal='hidden'] .mvp__bar {
  transform: scaleY(0);
}

:root[data-motion='full'] [data-reveal='hidden'] .mvp__rocket {
  opacity: 0;
  transform: translate(-18px, 22px) scale(0.7);
}

:root[data-motion='full'] [data-reveal='revealed'] .mvp__term,
:root[data-motion='full'] [data-reveal='revealed'] .mvp__sign,
:root[data-motion='full'] [data-reveal='revealed'] .mvp__result,
:root[data-motion='full'] [data-reveal='revealed'] .mvp__bar,
:root[data-motion='full'] [data-reveal='revealed'] .mvp__rocket {
  animation-duration: var(--enter-ms);
  animation-delay: var(--enter-delay);
  animation-timing-function: var(--ease-out);
  animation-fill-mode: both;
  animation-iteration-count: 1;
}

:root[data-motion='full'] [data-reveal='revealed'] .mvp__term {
  animation-name: mvp-term-in;
}

:root[data-motion='full'] [data-reveal='revealed'] .mvp__sign {
  animation-name: mvp-sign-in;
}

:root[data-motion='full'] [data-reveal='revealed'] .mvp__result {
  animation-name: mvp-grow;
}

:root[data-motion='full'] [data-reveal='revealed'] .mvp__bar {
  animation-name: mvp-bar-in;
}

:root[data-motion='full'] [data-reveal='revealed'] .mvp__rocket {
  animation-name: mvp-rocket-in;
  animation-timing-function: var(--ease-rocket);
}

@keyframes mvp-term-in {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.86);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes mvp-sign-in {
  from {
    opacity: 0;
    transform: scale(0.3);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes mvp-grow {
  from {
    opacity: 0;
    transform: scale(0);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes mvp-bar-in {
  from {
    transform: scaleY(0);
  }

  to {
    transform: scaleY(1);
  }
}

@keyframes mvp-rocket-in {
  from {
    opacity: 0;
    transform: translate(-18px, 22px) scale(0.7);
  }

  to {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }
}
</style>
