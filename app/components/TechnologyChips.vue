<script setup lang="ts">
import type { TechnologyGroup } from '~~/data/schema'

/** Chips de tecnologías de un puesto. Si hay varias etapas (System73), un grupo por área. */
defineProps<{ groups: TechnologyGroup[] }>()

const { t } = useI18n()
const cv = useCv()

const areaName = (areaId: string) => cv.value.skillAreas.find((area) => area.id === areaId)?.name ?? areaId
const groupLabel = (group: TechnologyGroup) =>
  group.areaId ? `${t('experience.technologies')} · ${areaName(group.areaId)}` : t('experience.technologies')
</script>

<template>
  <div v-if="groups.length" class="space-y-2" data-testid="technology-chips">
    <div v-for="group in groups" :key="group.areaId ?? 'all'" class="flex flex-wrap items-center gap-2">
      <span v-if="group.areaId" class="text-xs font-medium text-muted" aria-hidden="true">
        {{ areaName(group.areaId) }}
      </span>
      <ul :aria-label="groupLabel(group)" class="flex flex-wrap gap-1.5">
        <li v-for="technology in group.technologies" :key="technology">
          <UBadge color="neutral" variant="subtle" size="sm" :label="technology" />
        </li>
      </ul>
    </div>
  </div>
</template>
