<script setup lang="ts">
const cv = useCv()
</script>

<template>
  <ul class="flex flex-wrap items-center gap-2">
    <li v-for="link in cv.contactLinks" :key="link.url">
      <UButton
        :to="link.url"
        :icon="CONTACT_ICONS[link.label] ?? DEFAULT_CONTACT_ICON"
        :label="link.label"
        target="_blank"
        rel="noopener noreferrer"
        color="primary"
        variant="outline"
        size="sm"
      />
    </li>
  </ul>
</template>
