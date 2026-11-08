<script setup lang="ts">
/**
 * Contact links (networks only: never phone, email or address).
 * `labels="always"` muestra icono y texto; `labels="wide-only"` solo icono hasta xl.
 * `pick` limits and sorts by tag (e.g. only LinkedIn on Profile card, option F).
 */
const props = defineProps<{
  labels: 'always' | 'wide-only'
  pick?: readonly string[]
  /** Full width buttons of the container (Profile card, option F). */
  layout?: 'inline' | 'block'
}>()

const { t } = useI18n()
const cv = useCv()

const links = computed(() => {
  const all = cv.value.contactLinks
  if (!props.pick?.length) return all
  return props.pick.map((label) => all.find((link) => link.label === label)).filter((link) => link != null)
})

function accessibleName(label: string) {
  return `${label} – ${cv.value.fullName} (${t('app.opensInNewTab')})`
}
</script>

<template>
  <ul class="contact-links" :class="layout === 'block' ? 'contact-links--block' : 'flex flex-wrap items-center gap-2'">
    <li v-for="link in links" :key="link.url">
      <UButton
        :to="link.url"
        :icon="CONTACT_ICONS[link.label] ?? DEFAULT_CONTACT_ICON"
        :aria-label="accessibleName(link.label)"
        :data-testid="`contact-${link.label.toLowerCase()}`"
        target="_blank"
        rel="noopener noreferrer"
        color="primary"
        variant="outline"
        :block="layout === 'block'"
        class="min-h-11 justify-center"
        :class="layout === 'block' ? 'w-full' : 'min-w-11'"
      >
        <span :class="labels === 'wide-only' ? 'hidden xl:inline' : undefined">{{ link.label }}</span>
      </UButton>
    </li>
  </ul>
</template>

<style>
.contact-links--block {
  display: block;
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
}

.contact-links--block li {
  width: 100%;
}
</style>
