<script setup lang="ts">
import type { Cv } from '~~/data/schema'

/**
 * Side panel with the detail of a project. Dialogue (Nuxt UI) catches the spotlight,
 * closes with Escape and returns the spotlight to the card that opened it.
 */
defineProps<{ project: Cv['projects'][number] }>()
const open = defineModel<boolean>('open', { required: true })

const { t } = useI18n()
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
    :title="project.title"
    :description="project.description"
    data-testid="project-detail"
  >
    <!-- Own close button so that its accessible name follows the language of the website. -->
    <template #close="{ ui }">
      <UButton icon="i-lucide-x" color="neutral" variant="ghost" :aria-label="t('projects.closeDetail')" :class="ui.close()" />
    </template>

    <template #body>
      <div class="space-y-4">
        <img
          :src="`/${project.image}`"
          :alt="project.imageAlt"
          width="640"
          height="360"
          decoding="async"
          class="aspect-video w-full rounded-lg object-cover"
        >
        <UBadge color="neutral" variant="subtle" :label="t(`projects.categories.${project.category}`)" />
        <p>
          <ExternalLink :href="project.url" class="inline-flex items-center gap-1">
            <UIcon name="i-lucide-external-link" class="size-4" aria-hidden="true" />
            {{ t('projects.open', { title: project.title }) }}
          </ExternalLink>
        </p>
      </div>
    </template>
  </USlideover>
</template>
