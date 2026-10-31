<script lang="ts">
import { STORY_HEIGHT_VH, STORY_STAGES, stepHeightsVh, type StoryStageId } from '~~/lib/story'

const DESKTOP_HEIGHTS_VH = stepHeightsVh(STORY_HEIGHT_VH.desktop)
const TABLET_HEIGHTS_VH = stepHeightsVh(STORY_HEIGHT_VH.tablet)
</script>

<script setup lang="ts">
/**
 * Un tramo de texto del storytelling: fija su tono (colores del texto), su fondo propio
 * (sin pin: móvil o menos movimiento), su lado y el alto que lo hace coincidir con su tramo de scroll.
 */
const props = defineProps<{ stageId: StoryStageId }>()

const index = STORY_STAGES.findIndex((stage) => stage.id === props.stageId)
const stage = STORY_STAGES[index]!
const heightVars = {
  '--step-height-desktop': `${DESKTOP_HEIGHTS_VH[index]}vh`,
  '--step-height-tablet': `${TABLET_HEIGHTS_VH[index]}vh`,
}
</script>

<template>
  <div
    class="story__step"
    :class="[`tone-${stage.tone}`, `story-bg--${stage.background}`, `story__step--${stage.side}`]"
    :data-stage="stage.id"
    :style="heightVars"
  >
    <slot />
  </div>
</template>
