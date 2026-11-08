<script setup lang="ts">
import type { Period } from '~~/lib/period'
import { toMonthIndex } from '~~/lib/years'

/**
 * Key Profile figures (years in tech, full stack years, languages) in a band of three equal
 * columns, with the calculation note below. On the Home journey, scroll drives accents per
 * column (`PROFILE_COUNT_KEY` + `--fx-kpi-*`); values are readable from first paint.
 */
const props = defineProps<{ noteSrOnly?: boolean }>()

const { t, locale } = useI18n({ useScope: 'local' })
const cv = useCv()

const LANGUAGE_CODES: Record<string, string> = {
  spanish: 'ES',
  english: 'EN',
  italian: 'IT',
}

const languageCodes = computed(() =>
  cv.value.languages.map((language) => LANGUAGE_CODES[language.id] ?? language.id.slice(0, 2).toUpperCase()).join(' · '),
)

/** Back End (Octane11) marks “full stack” years. */
const FULL_STACK_AREA_ID = 'backend'
const countProgress = inject(PROFILE_COUNT_KEY, undefined)
const progress = computed(() => countProgress?.value)
const fx = (name: string) => ({ '--fx': `var(--fx-${name}, 1)` })
const MONTHS_PER_YEAR = 12

const monthYear = computed(() => new Intl.DateTimeFormat(locale.value, { month: 'short', year: 'numeric' }))

function formatPartialDate(partialDate: string): string {
  const monthIndex = toMonthIndex(partialDate)
  return monthYear.value.format(new Date(Math.floor(monthIndex / MONTHS_PER_YEAR), monthIndex % MONTHS_PER_YEAR))
}

/** Oldest start in a period list (data guarantees at least one). */
function earliestStart(periods: Period[]): string {
  return periods
    .map((period) => period.start)
    .reduce((earliest, start) => (toMonthIndex(start) < toMonthIndex(earliest) ? start : earliest))
}

/** From first experience month until today: “years in tech”. */
const techPeriods = computed<Period[]>(() => [
  { start: earliestStart(cv.value.skillAreas.flatMap((area) => area.periods)), end: null },
])

const fullStackPeriods = computed(() => {
  const area = cv.value.skillAreas.find((skillArea) => skillArea.id === FULL_STACK_AREA_ID)
  if (!area) throw new Error(`Missing area '${FULL_STACK_AREA_ID}' in CV data`)
  return area.periods
})

const countersNote = computed(() =>
  t('countersNote', {
    today: monthYear.value.format(new Date()),
    techSince: formatPartialDate(earliestStart(techPeriods.value)),
    fullStackSince: formatPartialDate(earliestStart(fullStackPeriods.value)),
  }),
)
</script>

<template>
  <div class="profile-stats">
    <h2 class="sr-only">{{ t('statsHeading') }}</h2>
    <div class="profile-stats__band">
      <ul class="profile-stats__grid" role="list">
        <li class="profile-stats__item profile-stats__fx" :style="fx('kpi-0')">
          <p class="profile-stats__value">
            <YearsFigure :periods="techPeriods" count-up :progress="progress" />
          </p>
          <p class="profile-stats__label">{{ t('yearsInTech') }}</p>
        </li>
        <li class="profile-stats__item profile-stats__fx" :style="fx('kpi-1')">
          <p class="profile-stats__value">
            <YearsFigure :periods="fullStackPeriods" count-up :progress="progress" />
          </p>
          <p class="profile-stats__label">{{ t('yearsFullStack') }}</p>
        </li>
        <li class="profile-stats__item profile-stats__fx" :style="fx('kpi-2')">
          <p class="profile-stats__value">
            <AnimatedNumber :value="cv.languages.length" animate :progress="progress" />
          </p>
          <p class="profile-stats__label">{{ t('languages') }}</p>
          <p class="profile-stats__meta" aria-hidden="true">{{ languageCodes }}</p>
        </li>
      </ul>
    </div>

    <p class="profile-stats__note profile-stats__fx" :class="{ 'sr-only': props.noteSrOnly }" :style="fx('note')">
      {{ countersNote }}
    </p>
  </div>
</template>

<style>
.profile-stats__band {
  position: relative;
  overflow: clip;
  border-block: 1px solid var(--ui-border);
  background: transparent;
}

.profile-stats__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
  padding: 0;
  list-style: none;
}

.profile-stats__item {
  display: flex;
  min-height: 4.25rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  padding: 0.875rem 0.35rem;
  text-align: center;
}

.profile-stats__item:not(:last-child) {
  border-inline-end: 1px solid var(--ui-border);
}

.profile-stats__value {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 2.8vw, 1.875rem);
  font-weight: 700;
  line-height: 1.1;
  color: var(--ui-primary);
  font-variant-numeric: tabular-nums;
}

.profile-stats__label {
  margin: 0;
  max-width: 9rem;
  font-size: 0.625rem;
  line-height: 1.25;
  color: var(--ui-text-muted);
  text-wrap: balance;
}

.profile-stats__meta {
  margin: 0.125rem 0 0;
  font-size: 0.5625rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ui-text-muted);
}

.profile-stats__note {
  margin: 0.625rem 0 0;
  font-size: 0.6875rem;
  line-height: 1.4;
  color: var(--ui-text-muted);
}

</style>

<i18n lang="json">
{
  "en": {
    "statsHeading": "Key figures",
    "yearsInTech": "Years in tech",
    "yearsFullStack": "Years full stack",
    "languages": "Languages",
    "countersNote": "From dates ({today}): in tech since {techSince}, full stack since {fullStackSince}."
  },
  "es": {
    "statsHeading": "Cifras clave",
    "yearsInTech": "Años en tecnología",
    "yearsFullStack": "Años full stack",
    "languages": "Idiomas",
    "countersNote": "Desde las fechas ({today}): en tecnología desde {techSince}, full stack desde {fullStackSince}."
  }
}
</i18n>
