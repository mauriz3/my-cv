<script setup lang="ts">
import type { Cv } from '~~/data/schema'

/**
 * Panel lateral con el detalle de un proyecto. El diálogo (Nuxt UI) atrapa el foco,
 * se cierra con Escape y devuelve el foco a la tarjeta que lo abrió.
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
    <!-- Botón de cierre propio para que su nombre accesible siga el idioma de la web. -->
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
