<script setup lang="ts">
/**
 * Enlaces de contacto (solo redes: nunca teléfono, email ni dirección).
 * `labels="always"` muestra icono y texto; `labels="wide-only"` solo icono hasta xl.
 */
defineProps<{ labels: 'always' | 'wide-only' }>()

const { t } = useI18n()
const cv = useCv()

function accessibleName(label: string) {
  return `${label} – ${cv.value.fullName} (${t('app.opensInNewTab')})`
}
</script>

<template>
  <ul class="flex flex-wrap items-center gap-2">
    <li v-for="link in cv.contactLinks" :key="link.url">
      <UButton
        :to="link.url"
        :icon="CONTACT_ICONS[link.label] ?? DEFAULT_CONTACT_ICON"
        :aria-label="accessibleName(link.label)"
        :data-testid="`contact-${link.label.toLowerCase()}`"
        target="_blank"
        rel="noopener noreferrer"
        color="primary"
        variant="outline"
        class="min-h-11 min-w-11 justify-center"
      >
        <span :class="labels === 'wide-only' ? 'hidden xl:inline' : undefined">{{ link.label }}</span>
      </UButton>
    </li>
  </ul>
</template>
